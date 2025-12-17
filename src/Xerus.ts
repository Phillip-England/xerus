import type { Server, ServerWebSocket } from "bun";
import { TrieNode } from "./TrieNode";
import { HTTPHandler } from "./HTTPHandler";
import { Middleware } from "./Middleware";

import { RouteGroup } from "./RouteGroup";
import { HTTPContext } from "./HTTPContext";
import type { HTTPHandlerFunc } from "./HTTPHandlerFunc";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { SystemErrRecord } from "./SystemErrRecord";
import { WSContext } from "./WSContext";
import type {
  WSCloseFunc,
  WSDrainFunc,
  WSMessageFunc,
  WSOnConnect,
  WSOpenFunc,
} from "./WSHandlerFuncs";
import { WSHandler } from "./WSHandler";

export class Xerus {
  DEBUG_MODE = false;
  private root: TrieNode = new TrieNode();
  private routes: Record<string, HTTPHandler> = {};
  private globalMiddlewares: Middleware[] = [];
  private notFoundHandler?: HTTPHandler;
  private errHandler?: HTTPHandler;
  private resolvedRoutes = new Map<
    string,
    { handler?: HTTPHandler; params: Record<string, string> }
  >();
  private wsRoutes: Record<string, WSHandler> = {};
  private wsOnConnects: Record<string, WSOnConnect> = {};
  private readonly MAX_CACHE_SIZE = 500;

  ws(
    path: string,
    handlers: {
      open?: WSOpenFunc;
      message?: WSMessageFunc;
      close?: WSCloseFunc;
      drain?: WSDrainFunc;
      onConnect?: WSOnConnect;
    },
    ...middlewares: Middleware[]
  ) {
    const handler = new WSHandler(handlers);
    handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));

    this.wsRoutes[path] = handler;
    if (handlers.onConnect) this.wsOnConnects[path] = handlers.onConnect;
    return this;
  }

  static(relPath: string) {
    this.get("/" + relPath + "/*", async (c: HTTPContext) => {
      return await c.file(process.cwd() + c.path);
    });
  }

  favicon(absolutePathToFavicon: string) {
    this.get("/favicon.ico", async (c: HTTPContext) => {
      return await c.file(absolutePathToFavicon);
    });
  }

  use(...middlewares: Middleware[]) {
    this.globalMiddlewares.push(...middlewares);
  }

  group(prefixPath: string, ...middlewares: Middleware[]) {
    return new RouteGroup(this, prefixPath, ...middlewares);
  }

  onErr(handlerFunc: HTTPHandlerFunc, ...middlewares: Middleware[]) {
    let handler = new HTTPHandler(handlerFunc);
    handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));
    this.errHandler = handler;
  }

  onNotFound(handlerFunc: HTTPHandlerFunc, ...middlewares: Middleware[]) {
    let handler = new HTTPHandler(handlerFunc);
    handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));
    this.notFoundHandler = handler;
  }

  private register(
    method: string,
    path: string,
    handlerFunc: HTTPHandlerFunc,
    middlewares: Middleware[],
  ) {
    try {
      let handler = new HTTPHandler(handlerFunc);
      handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));

      if (!path.includes(":") && !path.includes("*")) {
        if (this.routes[`${method} ${path}`]) {
          throw new SystemErr(
            SystemErrCode.ROUTE_ALREADY_REGISTERED,
            `Route ${method} ${path} has already been registered`,
          );
        }
        this.routes[`${method} ${path}`] = handler;
        return;
      }

      const parts = path.split("/").filter(Boolean);
      let node = this.root;

      for (const part of parts) {
        let isParam = part.startsWith(":");
        let isWildcard = part === "*";

        if (isParam) {
          node = node.children[":param"] ??
            (node.children[":param"] = new TrieNode());
          node.paramKey ||= part.slice(1);
        } else if (isWildcard) {
          node.wildcard = node.wildcard ?? new TrieNode();
          node = node.wildcard;
        } else {
          node = node.children[part] ?? (node.children[part] = new TrieNode());
        }
      }

      if (node.handlers[method]) {
        throw new SystemErr(
          SystemErrCode.ROUTE_ALREADY_REGISTERED,
          `Route ${method} ${path} has already been registered`,
        );
      }
      node.handlers[method] = handler;
    } catch (err) {
      throw err;
    }
  }

  get(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware[]) {
    this.register("GET", path, handler, middlewares);
    return this;
  }

  post(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware[]) {
    this.register("POST", path, handler, middlewares);
    return this;
  }

  put(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware[]) {
    this.register("PUT", path, handler, middlewares);
    return this;
  }

  delete(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware[]) {
    this.register("DELETE", path, handler, middlewares);
    return this;
  }

  patch(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware[]) {
    this.register("PATCH", path, handler, middlewares);
    return this;
  }

  find(
    method: string,
    path: string,
  ): { handler?: HTTPHandler; params: Record<string, string> } {
    const cacheKey = `${method} ${path}`;

    if (this.routes[cacheKey]) {
      return { handler: this.routes[cacheKey], params: {} };
    }

    const cached = this.resolvedRoutes.get(cacheKey);
    if (cached) {
      return cached;
    }

    const parts = path.split("/").filter(Boolean);
    let node: TrieNode = this.root;
    let params: Record<string, string> = {};

    for (const part of parts) {
      let exactMatch: TrieNode | undefined = node.children[part];
      let paramMatch: TrieNode | undefined = node.children[":param"];
      let wildcardMatch: TrieNode | undefined = node.wildcard;

      if (exactMatch) {
        node = exactMatch;
      } else if (paramMatch) {
        node = paramMatch;
        if (node.paramKey) {
          params[node.paramKey] = part;
        }
      } else if (wildcardMatch) {
        node = wildcardMatch;
        break;
      } else {
        return { handler: undefined, params: {} };
      }
    }

    const matchedHandler: HTTPHandler | undefined = node.handlers[method];
    if (!matchedHandler) {
      return { handler: undefined, params: {} };
    }

    if (this.resolvedRoutes.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.resolvedRoutes.keys().next().value;
      if (oldestKey !== undefined) {
        this.resolvedRoutes.delete(oldestKey);
      }
    }

    const result = { handler: matchedHandler, params };
    this.resolvedRoutes.set(cacheKey, result);
    return result;
  }

  async handleHTTP(
    req: Request,
    server: Server<any>,
  ): Promise<Response | void> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    if (method === "GET" && this.wsRoutes[path]) {
      return await this.handleWS(req, server, path);
    }

    try {
      const { handler, params } = this.find(method, path);
      if (handler) {
        const context = new HTTPContext(req, params);
        return await handler.execute(context);
      }
      if (this.notFoundHandler) {
        return this.notFoundHandler.execute(new HTTPContext(req));
      }
      throw new SystemErr(
        SystemErrCode.ROUTE_NOT_FOUND,
        `${method} ${path} is not registered`,
      );
    } catch (e: any) {
      let c = new HTTPContext(req);
      c.setErr(e);
      if (e instanceof SystemErr) {
        let errHandler = await SystemErrRecord[e.typeOf];
        return await errHandler(c);
      }
      if (this.errHandler) return this.errHandler.execute(c);
      return await SystemErrRecord[SystemErrCode.INTERNAL_SERVER_ERR](c);
    }
  }

  async handleWS(
    req: Request,
    server: Server<WSContext>,
    path: string,
  ): Promise<Response | void> {
    try {
      let context = new WSContext(req, path);
      if (this.wsOnConnects[path]) {
        await this.wsOnConnects[path](context);
      }
      if (server.upgrade(req, { data: context })) {
        return;
      }
    } catch (e: any) {
      throw new SystemErr(SystemErrCode.WEBSOCKET_UPGRADE_FAILURE, e.message);
    }
  }

  async listen(port: number = 8080) {
    let app = this;
    const server = Bun.serve({
      port: port,
      fetch: async (req: Request, server: Server<any>) => {
        return await app.handleHTTP(req, server);
      },
      websocket: {
        async open(ws: ServerWebSocket<WSContext>) {
          const handler = app.wsRoutes[ws.data.data.path]; // Accessing path from WSContext
          if (handler) await handler.compiledOpen(ws);
        },
        async message(ws: ServerWebSocket<WSContext>, message) {
          const handler = app.wsRoutes[ws.data.data.path];
          if (handler) await handler.compiledMessage(ws, message);
        },
        async close(ws: ServerWebSocket<WSContext>, code, message) {
          const handler = app.wsRoutes[ws.data.data.path];
          if (handler) await handler.compiledClose(ws, code, message);
        },
        async drain(ws: ServerWebSocket<WSContext>) {
          const handler = app.wsRoutes[ws.data.data.path];
          if (handler) await handler.compiledDrain(ws);
        },
      },
    });
    console.log(`🚀 Server running on ${server.port}`);
  }
}
