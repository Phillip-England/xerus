import type { Server, ServerWebSocket } from "bun";
import { TrieNode } from "./TrieNode";
import { HTTPHandler } from "./HTTPHandler";
import { Middleware } from "./Middleware";
import { RouteGroup } from "./RouteGroup";
import { HTTPContext } from "./HTTPContext";
import type { HTTPHandlerFunc, HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
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
import { resolve, join } from "path";
import { ObjectPool } from "./ObjectPool";

export class Xerus {
  private root: TrieNode = new TrieNode();
  private routes: Record<string, HTTPHandler> = {};
  private globalMiddlewares: Middleware<HTTPContext>[] = [];
  private notFoundHandler?: HTTPHandler;
  private errHandler?: HTTPHandler;
  private resolvedRoutes = new Map<
    string,
    { handler?: HTTPHandler; wsHandler?: WSHandler; params: Record<string, string> }
  >();
  private readonly MAX_CACHE_SIZE = 500;

  // Object Pool Configuration
  private contextPool: ObjectPool<HTTPContext>;

  constructor() {
    this.contextPool = new ObjectPool<HTTPContext>(
      () => new HTTPContext(),
      200
    );
  }

  setHTTPContextPool(size: number) {
    this.contextPool.resize(size);
  }

  private register(
    method: string,
    path: string,
    handlerObj: HTTPHandler | WSHandler,
  ) {
    const parts = path.split("/").filter(Boolean);
    let node = this.root;

    for (const part of parts) {
      if (part.startsWith(":")) {
        node = node.children[":param"] ?? (node.children[":param"] = new TrieNode());
        node.paramKey ||= part.slice(1);
      } else if (part === "*") {
        node.wildcard = node.wildcard ?? new TrieNode();
        node = node.wildcard;
      } else {
        node = node.children[part] ?? (node.children[part] = new TrieNode());
      }
    }

    if (handlerObj instanceof WSHandler) {
      if (node.wsHandler) {
        if (handlerObj.compiledOpen) node.wsHandler.compiledOpen = handlerObj.compiledOpen;
        if (handlerObj.compiledMessage) node.wsHandler.compiledMessage = handlerObj.compiledMessage;
        if (handlerObj.compiledClose) node.wsHandler.compiledClose = handlerObj.compiledClose;
        if (handlerObj.compiledDrain) node.wsHandler.compiledDrain = handlerObj.compiledDrain;
      } else {
        node.wsHandler = handlerObj;
      }
    } else {
      if (node.handlers[method]) {
        throw new SystemErr(
          SystemErrCode.ROUTE_ALREADY_REGISTERED,
          `Route ${method} ${path} has already been registered`,
        );
      }
      node.handlers[method] = handlerObj;
      if (!path.includes(":") && !path.includes("*")) {
        this.routes[`${method} ${path}`] = handlerObj;
      }
    }
  }

  private search(
    node: TrieNode,
    parts: string[],
    index: number,
    method: string,
    params: Record<string, string>
  ): { handler?: HTTPHandler; wsHandler?: WSHandler; params: Record<string, string> } | null {
    if (index === parts.length) {
      if (node.handlers[method] || node.wsHandler) {
        return { 
          handler: node.handlers[method], 
          wsHandler: node.wsHandler, 
          params 
        };
      }
      if (node.wildcard) {
        const wcNode = node.wildcard;
        if (wcNode.handlers[method] || wcNode.wsHandler) {
            return {
                handler: wcNode.handlers[method],
                wsHandler: wcNode.wsHandler,
                params
            };
        }
      }
      return null;
    }

    const part = parts[index];
    const exactNode = node.children[part];
    if (exactNode) {
      const result = this.search(exactNode, parts, index + 1, method, { ...params });
      if (result) return result; 
    }

    const paramNode = node.children[":param"];
    if (paramNode) {
      const newParams = { ...params };
      if (paramNode.paramKey) newParams[paramNode.paramKey] = part;
      const result = this.search(paramNode, parts, index + 1, method, newParams);
      if (result) return result;
    }

    if (node.wildcard) {
      const wcNode = node.wildcard;
      if (wcNode.handlers[method] || wcNode.wsHandler) {
        return {
          handler: wcNode.handlers[method],
          wsHandler: wcNode.wsHandler,
          params
        };
      }
    }

    return null;
  }

  find(
    method: string,
    path: string,
  ): { handler?: HTTPHandler; wsHandler?: WSHandler; params: Record<string, string> } {
    const normalizedPath = path.replace(/\/+$/, "") || "/";
    const cacheKey = `${method} ${normalizedPath}`;

    if (this.routes[cacheKey]) {
      return { handler: this.routes[cacheKey], params: {} };
    }

    const cached = this.resolvedRoutes.get(cacheKey);
    if (cached) {
      this.resolvedRoutes.delete(cacheKey);
      this.resolvedRoutes.set(cacheKey, cached);
      return cached;
    }

    const parts = normalizedPath.split("/").filter(Boolean);
    const result = this.search(this.root, parts, 0, method, {}) ?? { handler: undefined, params: {} };

    if (this.resolvedRoutes.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.resolvedRoutes.keys().next().value;
      if (oldestKey !== undefined) this.resolvedRoutes.delete(oldestKey);
    }

    this.resolvedRoutes.set(cacheKey, result);
    return result;
  }

  async handleHTTP(req: Request, server: Server<HTTPContext>): Promise<Response | void> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    const { handler, wsHandler, params } = this.find(method, path);

    if (method === "GET" && wsHandler && req.headers.get("Upgrade") === "websocket") {
      const context = new HTTPContext();
      context.reset(req, params); 
      (context as any)._wsHandler = wsHandler; 
      if (server.upgrade(req, { data: context })) return;
    }

    let context: HTTPContext | undefined;
    
    try {
      context = this.contextPool.acquire();
      context.reset(req, params);
      
      if (handler) {
        return await handler.execute(context);
      }
      
      if (this.notFoundHandler) {
        return await this.notFoundHandler.execute(context);
      }

      throw new SystemErr(SystemErrCode.ROUTE_NOT_FOUND, `${method} ${path} is not registered`);
      
    } catch (e: any) {
      const c = context || new HTTPContext();
      if (!context) c.reset(req, {});
      
      c.setErr(e);
      
      if (e instanceof SystemErr) {
        const errHandler = SystemErrRecord[e.typeOf];
        await errHandler(c);
        return c.res.send();
      }
      
      // Handle User-defined GLOBAL Error Handler
      if (this.errHandler) return await this.errHandler.execute(c);
      
      // NO HANDLERS FOUND - Fallback
      console.warn(`[XERUS WARNING] Route ${method} ${path} threw an error but has no granular error handler AND no global error handler was set via app.onErr().`);
      console.error(e);

      const defaultInternalHandler = SystemErrRecord[SystemErrCode.INTERNAL_SERVER_ERR];
      c.setStatus(500).text(`Internal Server Error\n\nError: ${e.message}\n\n[System Warning] No error handling strategy found.`);
      await defaultInternalHandler(c);
      return c.res.send();

    } finally {
      if (context) {
        this.contextPool.release(context);
      }
    }
  }

  async listen(port: number = 8080) {
    const app = this;
    const server: Server<HTTPContext> = Bun.serve({
      port: port,
      fetch: (req, server) => app.handleHTTP(req, server),
      websocket: {
        async open(ws: ServerWebSocket<any>) {
          try {
            const handler = ws.data._wsHandler as WSHandler;
            if (handler?.compiledOpen) await handler.compiledOpen(ws);
          } catch (e: any) {
            console.error("[WS ERROR] Open:", e.message);
            // 1011 = Internal Error
            ws.close(1011, "Middleware or Handler Error during Open"); 
          }
        },
        async message(ws: ServerWebSocket<any>, message) {
          try {
            const handler = ws.data._wsHandler as WSHandler;
            
            // UPDATED: Pass through raw message (String or Buffer) to protect binary data
            if (handler?.compiledMessage) await handler.compiledMessage(ws, message);
          } catch (e: any) {
            console.error("[WS ERROR] Message:", e.message);
            // We MUST close the socket if validation fails (and bubbles up here) 
            // so that client-side 'onclose' events trigger.
            ws.close(1011, "Validation Failed"); 
          }
        },
        async close(ws: ServerWebSocket<any>, code, message) {
          try {
            const handler = ws.data._wsHandler as WSHandler;
            if (handler?.compiledClose) await handler.compiledClose(ws, code, message);
          } catch (e: any) {
            console.error("[WS ERROR] Close:", e.message);
          }
        },
        async drain(ws: ServerWebSocket<any>) {
          try {
            const handler = ws.data._wsHandler as WSHandler;
            if (handler?.compiledDrain) await handler.compiledDrain(ws);
          } catch (e: any) {
            console.error("[WS ERROR] Drain:", e.message);
            ws.close(1011, "Drain Error");
          }
        },
      },
    });
    console.log(`🚀 Server running on ${server.port}`);
  }

  private parseArgs(
    args: (Middleware<HTTPContext> | HTTPErrorHandlerFunc)[]
  ): { errHandler?: HTTPErrorHandlerFunc, middlewares: Middleware<HTTPContext>[] } {
    let errHandler: HTTPErrorHandlerFunc | undefined;
    let middlewares: Middleware<HTTPContext>[] = [];

    if (args.length > 0) {
       if (typeof args[0] === 'function') {
           errHandler = args[0] as HTTPErrorHandlerFunc;
           middlewares = args.slice(1) as Middleware<HTTPContext>[];
       } else {
           middlewares = args as Middleware<HTTPContext>[];
       }
    }

    return { errHandler, middlewares };
  }
  
  private validateRoute(method: string, path: string, errHandler?: HTTPErrorHandlerFunc) {
      if (!errHandler && !this.errHandler) {
          console.warn(`[XERUS WARNING] Registering ${method} ${path} without a Granular Error Handler and no Global Error Handler (app.onErr) is set. Uncaught errors will default to a raw 500.`);
      }
  }

  // --- HTTP Methods ---

  get(path: string, h: HTTPHandlerFunc, ...args: (Middleware<HTTPContext> | HTTPErrorHandlerFunc)[]) {
    const { errHandler, middlewares } = this.parseArgs(args);
    this.validateRoute("GET", path, errHandler);

    const handler = new HTTPHandler(h, errHandler);
    handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));
    this.register("GET", path, handler);
    return this;
  }

  post(path: string, h: HTTPHandlerFunc, ...args: (Middleware<HTTPContext> | HTTPErrorHandlerFunc)[]) {
    const { errHandler, middlewares } = this.parseArgs(args);
    this.validateRoute("POST", path, errHandler);

    const handler = new HTTPHandler(h, errHandler);
    handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));
    this.register("POST", path, handler);
    return this;
  }

  put(path: string, h: HTTPHandlerFunc, ...args: (Middleware<HTTPContext> | HTTPErrorHandlerFunc)[]) {
    const { errHandler, middlewares } = this.parseArgs(args);
    this.validateRoute("PUT", path, errHandler);

    const handler = new HTTPHandler(h, errHandler);
    handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));
    this.register("PUT", path, handler);
    return this;
  }

  delete(path: string, h: HTTPHandlerFunc, ...args: (Middleware<HTTPContext> | HTTPErrorHandlerFunc)[]) {
    const { errHandler, middlewares } = this.parseArgs(args);
    this.validateRoute("DELETE", path, errHandler);

    const handler = new HTTPHandler(h, errHandler);
    handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));
    this.register("DELETE", path, handler);
    return this;
  }

  patch(path: string, h: HTTPHandlerFunc, ...args: (Middleware<HTTPContext> | HTTPErrorHandlerFunc)[]) {
    const { errHandler, middlewares } = this.parseArgs(args);
    this.validateRoute("PATCH", path, errHandler);

    const handler = new HTTPHandler(h, errHandler);
    handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));
    this.register("PATCH", path, handler);
    return this;
  }

  // --- WebSocket Methods ---

  open(path: string, handler: WSOpenFunc, ...args: (Middleware<HTTPContext> | HTTPErrorHandlerFunc)[]) {
    const { errHandler, middlewares } = this.parseArgs(args);
    const wsHandler = new WSHandler();
    wsHandler.setOpen(handler, this.globalMiddlewares.concat(middlewares), errHandler);
    this.register("WS", path, wsHandler);
    return this;
  }

  message(path: string, handler: WSMessageFunc, ...args: (Middleware<HTTPContext> | HTTPErrorHandlerFunc)[]) {
    const { errHandler, middlewares } = this.parseArgs(args);
    const wsHandler = new WSHandler();
    wsHandler.setMessage(handler, this.globalMiddlewares.concat(middlewares), errHandler);
    this.register("WS", path, wsHandler);
    return this;
  }

  close(path: string, handler: WSCloseFunc, ...args: (Middleware<HTTPContext> | HTTPErrorHandlerFunc)[]) {
    const { errHandler, middlewares } = this.parseArgs(args);
    const wsHandler = new WSHandler();
    wsHandler.setClose(handler, this.globalMiddlewares.concat(middlewares), errHandler);
    this.register("WS", path, wsHandler);
    return this;
  }

  drain(path: string, handler: WSDrainFunc, ...args: (Middleware<HTTPContext> | HTTPErrorHandlerFunc)[]) {
    const { errHandler, middlewares } = this.parseArgs(args);
    const wsHandler = new WSHandler();
    wsHandler.setDrain(handler, this.globalMiddlewares.concat(middlewares), errHandler);
    this.register("WS", path, wsHandler);
    return this;
  }

  embed(pathPrefix: string, embeddedFiles: Record<string, { content: string | Buffer | Uint8Array | number[]; type: string }>) {
      const prefix = pathPrefix === "/" ? "" : pathPrefix;
      
      this.get(prefix + "/*", async (c: HTTPContext) => {
        const lookupPath = c.path.substring(prefix.length);
        const file = embeddedFiles[lookupPath] || embeddedFiles[lookupPath + "/index.html"];
        
        if (!file) throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, `Asset ${lookupPath} not found`);
        
        c.setHeader("Content-Type", file.type);
        
        let bodyData = file.content;
        if (Array.isArray(bodyData)) {
            bodyData = new Uint8Array(bodyData);
        }

        c.res.body(bodyData);
        c.finalize(); 
      });
  }

  static(pathPrefix: string, rootDir: string) {
    const prefix = pathPrefix === "/" ? "" : pathPrefix.replace(/\/+$/, "");
    const absRoot = resolve(rootDir);

    this.get(prefix + "/*", async (c: HTTPContext) => {
      const urlPath = c.path.substring(prefix.length);
      const relativePath = urlPath.replace(/^\/+/, "");
      const finalPath = resolve(join(absRoot, relativePath));

      if (!finalPath.startsWith(absRoot)) {
        throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, "Access Denied");
      }

      await c.file(finalPath);
    });
  }
    
  use(...m: Middleware<HTTPContext>[]) { this.globalMiddlewares.push(...m); }
  group(prefix: string, ...m: Middleware<HTTPContext>[]) { return new RouteGroup(this, prefix, ...m); }
  
  onNotFound(h: HTTPHandlerFunc, ...m: Middleware<HTTPContext>[]) {
    const handler = new HTTPHandler(h);
    handler.setMiddlewares(this.globalMiddlewares.concat(m));
    this.notFoundHandler = handler;
  }

  /**
   * Registers a global error handler.
   * This handler is called when a route fails AND has no local error handler defined.
   * * @param h The error handler function: (c: HTTPContext, err: any) => Promise<void>
   * @param m Optional middlewares to run specifically for the error handler
   */
  onErr(h: HTTPErrorHandlerFunc, ...m: Middleware<HTTPContext>[]) {
    // Adapter: Wrap the (c, err) function into a standard (c) HTTPHandlerFunc
    const wrapper: HTTPHandlerFunc = async (c: HTTPContext) => {
        const err = c.getErr();
        await h(c, err);
    };

    const handler = new HTTPHandler(wrapper);
    handler.setMiddlewares(this.globalMiddlewares.concat(m));
    this.errHandler = handler;
  }
}