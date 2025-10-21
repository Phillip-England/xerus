import type { ServerWebSocket, Server  } from "bun";
import { TrieNode } from "./TrieNode";
import { HTTPHandler } from "./HTTPHandler";
import { Middleware } from "./Middleware";
import  type { WSOpenFunc } from "./WSOpenFunc";
import type { WSMessageFunc } from "./WSMessageFunc";
import type { WSCloseFunc } from "./WSCloseFunc";
import type { WSDrainFunc } from "./WSDrainFunc";
import type { WSOnConnect } from "./WSOnConnect";
import { RouteGroup } from "./RouteGroup";
import { HTTPContext } from "./HTTPContext";
import type { HTTPHandlerFunc } from "./HTTPHandlerFunc";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { SystemErrRecord } from "./SystemErrRecord";
import { WSContext } from "./WSContext";
import path from 'path'

export class Xerus {
  DEBUG_MODE = false;
  private root: TrieNode = new TrieNode();
  private routes: Record<string, HTTPHandler> = {}; // Replacing Map with object
  private globalMiddlewares: Middleware[] = [];
  private notFoundHandler?: HTTPHandler;
  private errHandler?: HTTPHandler;
  private resolvedRoutes = new Map<
    string,
    { handler?: HTTPHandler; params: Record<string, string> }
  >();
  private readonly MAX_CACHE_SIZE = 100;
  private wsOpenRoutes: Record<string, WSOpenFunc> =
    {};
  private wsMessageRoutes: Record<string, WSMessageFunc> = {};
  private wsCloseRoutes: Record<string, WSCloseFunc> = {};
  private wsDrainRoutes: Record<string, WSDrainFunc> = {};
  private wsOnConnects: Record<string, WSOnConnect> = {};
  private wsRoutes: Record<string, boolean> = {}

  ws(
    path: string,
    handlers: {
      open?: WSOpenFunc;
      message?: WSMessageFunc;
      close?: WSCloseFunc;
      drain?: WSDrainFunc;
      onConnect?: WSOnConnect;
    },
  ) {
    this.wsRoutes[path] = true
    if (handlers.open) this.wsOpenRoutes[path] = handlers.open;
    if (handlers.message) this.wsMessageRoutes[path] = handlers.message;
    if (handlers.close) this.wsCloseRoutes[path] = handlers.close;
    if (handlers.drain) this.wsDrainRoutes[path] = handlers.drain;
    if (handlers.onConnect) this.wsOnConnects[path] = handlers.onConnect
  }

  static(relPath: string) {
    this.get('/'+relPath+'/*', async (c: HTTPContext) => {
      return await c.file(process.cwd()+c.path);
    })
  }

  favicon(absolutePathToFavicon: string) {
    this.get('/favicon.ico', async (c: HTTPContext) => {
      return await c.file(absolutePathToFavicon)
    })
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
          `Route ${method} ${path} has already been registered`
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
        node = node.children[":param"] ?? (node.children[":param"] = new TrieNode());
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
        `Route ${method} ${path} has already been registered`
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

  async handleHTTP(req: Request, server: Server): Promise<Response | void> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // determine if a ws path has been hit
    if (this.wsRoutes[path]) {
      return await this.handleWS(req, server, path)
    }

    try {
      const { handler, params } = this.find(method, path);
      if (handler) {
        const context = new HTTPContext(req, params);
        return await handler.execute(context);
      }
      if (this.notFoundHandler) {
        return this.notFoundHandler.execute(new HTTPContext(req))
      }
      throw new SystemErr(SystemErrCode.ROUTE_NOT_FOUND, `${method} ${path} is not registered`)
    } catch (e: any) {

      // setting up our context with an error
      let c = new HTTPContext(req);
      c.setErr(e)

      // catching all system-level errors (errors that can occur within functions provided by Xerus)
      if (e instanceof SystemErr) {
        let errHandler = await SystemErrRecord[e.typeOf]
        return await errHandler(c)
      }

      // if the user has default error handling
      if (this.errHandler) {
        return this.errHandler.execute(c)
      }
      
      // if the user does not have an error handler setup, then send a default message
      return await SystemErrRecord[SystemErrCode.INTERNAL_SERVER_ERR](c)
    }
  }

  async handleWS(req: Request, server: Server, path: string): Promise<Response | void> {
    try {
      let context = new WSContext(req, path)
      if (this.wsOnConnects[path]) {
        let onConnect = this.wsOnConnects[path]
        await onConnect(context)
        await this.wsOnConnects[path](context)
      }
      if (server.upgrade(req, context)) {
        return;
      }
    } catch (e: any) {
      throw new SystemErr(SystemErrCode.WEBSOCKET_UPGRADE_FAILURE, e.message)
    }
  }

  async handleOpenWS(ws: ServerWebSocket<unknown>) {
    let data = ws.data as any;
    let handler = this.wsOpenRoutes[data.path];
    if (handler) await handler(ws);
  }

  private async handleMessageWS(
    ws: ServerWebSocket<unknown>,
    message: string | Buffer<ArrayBufferLike>,
  ) {
    let data = ws.data as any;
    let handler = this.wsMessageRoutes[data.path];
    if (handler) await handler(ws, message);
  }

  private async handleCloseWS(
    ws: ServerWebSocket<unknown>,
    code: number,
    message: string,
  ) {
    let data = ws.data as any;
    let handler = this.wsCloseRoutes[data.path];
    if (handler) await handler(ws, code, message);
  }

  private async handleDrainWS(ws: ServerWebSocket<unknown>) {
    let data = ws.data as any;
    let handler = this.wsDrainRoutes[data.path];
    if (handler) await handler(ws);
  }

  async listen(port: number = 8080) {
    let app = this;
    const server = Bun.serve({
      port: port,
      fetch: async (req: Request, server: Server) => {
        return await app.handleHTTP(req, server);
      },
      websocket: {
        async open(ws) {
          await app.handleOpenWS(ws);
        },
        async message(ws, message) {
          await app.handleMessageWS(ws, message);
        },
        async close(ws, code, message) {
          await app.handleCloseWS(ws, code, message);
        },
        async drain(ws) {
          await app.handleDrainWS(ws);
        },
      },
    });
    console.log(`🚀 Server running on ${server.port}`);
  }
}
