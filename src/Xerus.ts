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
import { resolve, join } from "path"; // Node compat for secure path resolution

export class Xerus {
  private root: TrieNode = new TrieNode();
  private routes: Record<string, HTTPHandler> = {}; // Cache for exact HTTP routes
  private globalMiddlewares: Middleware<HTTPContext>[] = [];
  private notFoundHandler?: HTTPHandler;
  private errHandler?: HTTPHandler;
  private resolvedRoutes = new Map<
    string,
    { handler?: HTTPHandler; wsHandler?: WSHandler; params: Record<string, string> }
  >();
  private readonly MAX_CACHE_SIZE = 500;

  /**
   * Internal registration logic for both HTTP and WebSockets
   */
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
      node.wsHandler = handlerObj;
    } else {
      if (node.handlers[method]) {
        throw new SystemErr(
          SystemErrCode.ROUTE_ALREADY_REGISTERED,
          `Route ${method} ${path} has already been registered`,
        );
      }
      node.handlers[method] = handlerObj;
      // Add to fast-lookup cache if literal
      if (!path.includes(":") && !path.includes("*")) {
        this.routes[`${method} ${path}`] = handlerObj;
      }
    }
  }

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
    const wsHandler = new WSHandler();
    const sharedMiddlewares = this.globalMiddlewares.concat(middlewares);

    const setupLifecycle = (key: "open" | "message" | "close" | "drain") => {
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

      const fullChain = sharedMiddlewares.concat(specificMiddlewares);

      if (key === "open") wsHandler.setOpen(handlerFunc, fullChain);
      if (key === "message") wsHandler.setMessage(handlerFunc, fullChain);
      if (key === "close") wsHandler.setClose(handlerFunc, fullChain);
      if (key === "drain") wsHandler.setDrain(handlerFunc, fullChain);
    };

    setupLifecycle("open");
    setupLifecycle("message");
    setupLifecycle("close");
    setupLifecycle("drain");

    this.register("WS", path, wsHandler);
    return this;
  }

  find(
    method: string,
    path: string,
  ): { handler?: HTTPHandler; wsHandler?: WSHandler; params: Record<string, string> } {
    const normalizedPath = path.replace(/\/+$/, "") || "/";
    const cacheKey = `${method} ${normalizedPath}`;

    // Fast check literal cache for HTTP
    if (this.routes[cacheKey]) {
      return { handler: this.routes[cacheKey], params: {} };
    }

    const cached = this.resolvedRoutes.get(cacheKey);
    if (cached) return cached;

    const parts = normalizedPath.split("/").filter(Boolean);
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
        node.paramKey && (params[node.paramKey] = part);
      } else if (wildcardMatch) {
        node = wildcardMatch;
        break;
      } else {
        return { handler: undefined, params: {} };
      }
    }

    let matchedHandler = node.handlers[method];
    if (!matchedHandler && node.wildcard) {
      matchedHandler = node.wildcard.handlers[method];
    }

    const result = { 
        handler: matchedHandler, 
        wsHandler: node.wsHandler, 
        params 
    };

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

    // 1. Unified Lookup
    const { handler, wsHandler, params } = this.find(method, path);

    // 2. Handle Upgrade (Supports dynamic WS routes)
    if (method === "GET" && wsHandler && req.headers.get("Upgrade") === "websocket") {
      const context = new HTTPContext(req, params);
      // We store the resolved wsHandler on the context for Bun's lifecycle hooks
      (context as any)._wsHandler = wsHandler; 
      if (server.upgrade(req, { data: context })) return;
    }

    let context: HTTPContext | undefined;
    try {
      context = new HTTPContext(req, params);
      if (handler) return await handler.execute(context);
      if (this.notFoundHandler) return await this.notFoundHandler.execute(context);

      throw new SystemErr(SystemErrCode.ROUTE_NOT_FOUND, `${method} ${path} is not registered`);
    } catch (e: any) {
      const c = context || new HTTPContext(req);
      c.setErr(e);
      if (e instanceof SystemErr) {
        const errHandler = SystemErrRecord[e.typeOf];
        await errHandler(c);
        return c.res.send();
      }
      if (this.errHandler) return await this.errHandler.execute(c);
      const defaultInternalHandler = SystemErrRecord[SystemErrCode.INTERNAL_SERVER_ERR];
      await defaultInternalHandler(c);
      return c.res.send();
    }
  }

  async listen(port: number = 8080) {
    const app = this;
    const server: Server<HTTPContext> = Bun.serve({
      port: port,
      fetch: (req, server) => app.handleHTTP(req, server),
      websocket: {
        async open(ws: ServerWebSocket<any>) {
          const handler = ws.data._wsHandler as WSHandler;
          if (handler?.compiledOpen) await handler.compiledOpen(ws);
        },
        async message(ws: ServerWebSocket<any>, message) {
          const handler = ws.data._wsHandler as WSHandler;
          if (handler?.compiledMessage) await handler.compiledMessage(ws, message);
        },
        async close(ws: ServerWebSocket<any>, code, message) {
          const handler = ws.data._wsHandler as WSHandler;
          if (handler?.compiledClose) await handler.compiledClose(ws, code, message);
        },
        async drain(ws: ServerWebSocket<any>) {
          const handler = ws.data._wsHandler as WSHandler;
          if (handler?.compiledDrain) await handler.compiledDrain(ws);
        },
      },
    });
    console.log(`🚀 Server running on ${server.port}`);
  }

  // --- Registration Helpers ---

  get(path: string, h: HTTPHandlerFunc, ...m: Middleware<HTTPContext>[]) {
    const handler = new HTTPHandler(h);
    handler.setMiddlewares(this.globalMiddlewares.concat(m));
    this.register("GET", path, handler);
    return this;
  }

  post(path: string, h: HTTPHandlerFunc, ...m: Middleware<HTTPContext>[]) {
    const handler = new HTTPHandler(h);
    handler.setMiddlewares(this.globalMiddlewares.concat(m));
    this.register("POST", path, handler);
    return this;
  }

  put(path: string, h: HTTPHandlerFunc, ...m: Middleware<HTTPContext>[]) {
    const handler = new HTTPHandler(h);
    handler.setMiddlewares(this.globalMiddlewares.concat(m));
    this.register("PUT", path, handler);
    return this;
  }

  delete(path: string, h: HTTPHandlerFunc, ...m: Middleware<HTTPContext>[]) {
    const handler = new HTTPHandler(h);
    handler.setMiddlewares(this.globalMiddlewares.concat(m));
    this.register("DELETE", path, handler);
    return this;
  }

  patch(path: string, h: HTTPHandlerFunc, ...m: Middleware<HTTPContext>[]) {
    const handler = new HTTPHandler(h);
    handler.setMiddlewares(this.globalMiddlewares.concat(m));
    this.register("PATCH", path, handler);
    return this;
  }

  open(path: string, h: WSOpenFunc, ...m: Middleware<HTTPContext>[]) {
    return this.ws(path, { open: h }, ...m);
  }

  message(path: string, h: WSMessageFunc, ...m: Middleware<HTTPContext>[]) {
    return this.ws(path, { message: h }, ...m);
  }

  close(path: string, h: WSCloseFunc, ...m: Middleware<HTTPContext>[]) {
    return this.ws(path, { close: h }, ...m);
  }

  drain(path: string, h: WSDrainFunc, ...m: Middleware<HTTPContext>[]) {
    return this.ws(path, { drain: h }, ...m);
  }

  /**
   * Serve files from memory (using embedDir macro output)
   */
  embed(pathPrefix: string, embeddedFiles: Record<string, { content: string | Buffer | Uint8Array; type: string }>) {
      const prefix = pathPrefix === "/" ? "" : pathPrefix;
      this.get(prefix + "/*", async (c: HTTPContext) => {
        const lookupPath = c.path.substring(prefix.length);
        const file = embeddedFiles[lookupPath] || embeddedFiles[lookupPath + "/index.html"];
        
        if (!file) throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, `Asset ${lookupPath} not found`);
        
        c.setHeader("Content-Type", file.type);
        c.res.body(file.content);
        
        c.finalize(); // Updated to use the public API
      });
  }

  /**
   * Serve files from disk (Traditional static hosting)
   */
  static(pathPrefix: string, rootDir: string) {
    const prefix = pathPrefix === "/" ? "" : pathPrefix.replace(/\/+$/, "");
    
    // Resolve absolute path of root directory immediately to lock it in
    const absRoot = resolve(rootDir);

    this.get(prefix + "/*", async (c: HTTPContext) => {
      // Get the part of the URL after the prefix
      const urlPath = c.path.substring(prefix.length);
      
      // Remove leading slashes to make it relative for joining
      const relativePath = urlPath.replace(/^\/+/, "");

      // Securely resolve the full path
      const finalPath = resolve(join(absRoot, relativePath));

      // Security Check: Directory Traversal Prevention
      // Ensure the resolved final path still starts with the root directory
      if (!finalPath.startsWith(absRoot)) {
        throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, "Access Denied");
      }

      // c.file() handles the existence check and 404 throwing
      await c.file(finalPath);
    });
  }
  
  use(...m: Middleware<HTTPContext>[]) { this.globalMiddlewares.push(...m); }
  group(prefix: string, ...m: Middleware<HTTPContext>[]) { return new RouteGroup(this, prefix, ...m); }
  onErr(h: HTTPHandlerFunc, ...m: Middleware<HTTPContext>[]) {
    const handler = new HTTPHandler(h);
    handler.setMiddlewares(this.globalMiddlewares.concat(m));
    this.errHandler = handler;
  }
  onNotFound(h: HTTPHandlerFunc, ...m: Middleware<HTTPContext>[]) {
    const handler = new HTTPHandler(h);
    handler.setMiddlewares(this.globalMiddlewares.concat(m));
    this.notFoundHandler = handler;
  }
}