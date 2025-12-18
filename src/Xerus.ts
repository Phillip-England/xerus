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
import type {
  WSCloseFunc,
  WSDrainFunc,
  WSMessageFunc,
  WSOpenFunc,
} from "./WSHandlerFuncs";
import { WSHandler } from "./WSHandler";

export class Xerus {
  private root: TrieNode = new TrieNode();
  private routes: Record<string, HTTPHandler> = {};
  private globalMiddlewares: Middleware<HTTPContext>[] = [];
  private notFoundHandler?: HTTPHandler;
  private errHandler?: HTTPHandler;
  private resolvedRoutes = new Map<
    string,
    { handler?: HTTPHandler; params: Record<string, string> }
  >();
  public wsRoutes: Record<string, WSHandler> = {};
  private readonly MAX_CACHE_SIZE = 500;

  private getOrCreateWSHandler(path: string): WSHandler {
    if (!this.wsRoutes[path]) this.wsRoutes[path] = new WSHandler();
    return this.wsRoutes[path];
  }

  /**
   * Defines a full WebSocket route with individual lifecycle handlers and shared middlewares.
   */
  ws(
    path: string,
    handlers: {
      open?: WSOpenFunc | { handler: WSOpenFunc; middlewares: Middleware<HTTPContext>[] };
      message?: WSMessageFunc | { handler: WSMessageFunc; middlewares: Middleware<HTTPContext>[] };
      close?: WSCloseFunc | { handler: WSCloseFunc; middlewares: Middleware<HTTPContext>[] };
      drain?: WSDrainFunc | { handler: WSDrainFunc; middlewares: Middleware<HTTPContext>[] };
    },
    ...middlewares: Middleware<HTTPContext>[]
  ) {
    const wsHandler = this.getOrCreateWSHandler(path);
    const sharedMiddlewares = this.globalMiddlewares.concat(middlewares);

    const setupLifecycle = (key: 'open' | 'message' | 'close' | 'drain') => {
      const config = handlers[key];
      if (!config) return;

      let handlerFunc: any;
      let specificMiddlewares: Middleware<HTTPContext>[] = [];

      if (typeof config === "function") {
        handlerFunc = config;
      } else {
        handlerFunc = config.handler;
        specificMiddlewares = config.middlewares;
      }

      // Chain logic: Global -> Group/Shared -> Lifecycle-Specific
      const fullChain = sharedMiddlewares.concat(specificMiddlewares);

      if (key === 'open') wsHandler.setOpen(handlerFunc, fullChain);
      if (key === 'message') wsHandler.setMessage(handlerFunc, fullChain);
      if (key === 'close') wsHandler.setClose(handlerFunc, fullChain);
      if (key === 'drain') wsHandler.setDrain(handlerFunc, fullChain);
    };

    setupLifecycle('open');
    setupLifecycle('message');
    setupLifecycle('close');
    setupLifecycle('drain');

    return this;
  }

  static(pathPrefix: string, embeddedFiles: Record<string, { content: string; type: string }>) {
    const prefix = pathPrefix === "/" ? "" : pathPrefix;
    this.get(prefix + "/*", async (c: HTTPContext) => {
      const lookupPath = c.path.substring(prefix.length);
      const file = embeddedFiles[lookupPath] || embeddedFiles[lookupPath + "/index.html"];
      if (!file) {
        throw new SystemErr(
          SystemErrCode.FILE_NOT_FOUND, 
          `Asset ${lookupPath} not found in embedded directory`
        );
      }
      return c.setHeader("Content-Type", file.type).text(file.content);
    });
  }

  open(path: string, handler: WSOpenFunc, ...middlewares: Middleware<HTTPContext>[]) {
    this.getOrCreateWSHandler(path).setOpen(handler, this.globalMiddlewares.concat(middlewares));
    return this;
  }

  message(path: string, handler: WSMessageFunc, ...middlewares: Middleware<HTTPContext>[]) {
    this.getOrCreateWSHandler(path).setMessage(handler, this.globalMiddlewares.concat(middlewares));
    return this;
  }

  close(path: string, handler: WSCloseFunc, ...middlewares: Middleware<HTTPContext>[]) {
    this.getOrCreateWSHandler(path).setClose(handler, this.globalMiddlewares.concat(middlewares));
    return this;
  }

  drain(path: string, handler: WSDrainFunc, ...middlewares: Middleware<HTTPContext>[]) {
    this.getOrCreateWSHandler(path).setDrain(handler, this.globalMiddlewares.concat(middlewares));
    return this;
  }

  use(...middlewares: Middleware<HTTPContext>[]) {
    this.globalMiddlewares.push(...middlewares);
  }

  group(prefixPath: string, ...middlewares: Middleware<HTTPContext>[]) {
    return new RouteGroup(this, prefixPath, ...middlewares);
  }

  onErr(handlerFunc: HTTPHandlerFunc, ...middlewares: Middleware<HTTPContext>[]) {
    let handler = new HTTPHandler(handlerFunc);
    handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));
    this.errHandler = handler;
  }

  onNotFound(handlerFunc: HTTPHandlerFunc, ...middlewares: Middleware<HTTPContext>[]) {
    let handler = new HTTPHandler(handlerFunc);
    handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));
    this.notFoundHandler = handler;
  }

  private register(
    method: string,
    path: string,
    handlerFunc: HTTPHandlerFunc,
    middlewares: Middleware<HTTPContext>[],
  ) {
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
        `Route ${method} ${path} has already been registered`,
      );
    }
    node.handlers[method] = handler;
  }

  get(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware<HTTPContext>[]) {
    this.register("GET", path, handler, middlewares);
    return this;
  }

  post(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware<HTTPContext>[]) {
    this.register("POST", path, handler, middlewares);
    return this;
  }

  put(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware<HTTPContext>[]) {
    this.register("PUT", path, handler, middlewares);
    return this;
  }

  delete(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware<HTTPContext>[]) {
    this.register("DELETE", path, handler, middlewares);
    return this;
  }

  patch(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware<HTTPContext>[]) {
    this.register("PATCH", path, handler, middlewares);
    return this;
  }

  find(
    method: string,
    path: string,
  ): { handler?: HTTPHandler; params: Record<string, string> } {
    const cacheKey = `${method} ${path}`;
    if (this.routes[cacheKey]) return { handler: this.routes[cacheKey], params: {} };
    const cached = this.resolvedRoutes.get(cacheKey);
    if (cached) return cached;

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
        if (node.paramKey) params[node.paramKey] = part;
      } else if (wildcardMatch) {
        node = wildcardMatch;
        break;
      } else {
        return { handler: undefined, params: {} };
      }
    }

    const matchedHandler: HTTPHandler | undefined = node.handlers[method];
    if (!matchedHandler) return { handler: undefined, params: {} };

    if (this.resolvedRoutes.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.resolvedRoutes.keys().next().value;
      if (oldestKey !== undefined) this.resolvedRoutes.delete(oldestKey);
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
      throw new SystemErr(SystemErrCode.ROUTE_NOT_FOUND, `${method} ${path} is not registered`);
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
    server: Server<HTTPContext>,
    path: string,
  ): Promise<Response | void> {
    try {
      let context = new HTTPContext(req);
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
        async open(ws: ServerWebSocket<HTTPContext>) {
          const handler = app.wsRoutes[ws.data.path];
          if (handler && handler.compiledOpen) await handler.compiledOpen(ws);
        },
        async message(ws: ServerWebSocket<HTTPContext>, message) {
          const handler = app.wsRoutes[ws.data.path];
          if (handler && handler.compiledMessage) await handler.compiledMessage(ws, message);
        },
        async close(ws: ServerWebSocket<HTTPContext>, code, message) {
          const handler = app.wsRoutes[ws.data.path];
          if (handler && handler.compiledClose) await handler.compiledClose(ws, code, message);
        },
        async drain(ws: ServerWebSocket<HTTPContext>) {
          const handler = app.wsRoutes[ws.data.path];
          if (handler && handler.compiledDrain) await handler.compiledDrain(ws);
        },
      },
    });
    console.log(`🚀 Server running on ${server.port}`);
  }
}