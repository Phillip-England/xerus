// PATH: /home/jacex/src/xerus/src/Xerus.ts

import type { Server, ServerWebSocket } from "bun";
import { TrieNode } from "./TrieNode";
import { HTTPHandler } from "./HTTPHandler";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import type { HTTPHandlerFunc, HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { SystemErrRecord } from "./SystemErrRecord";
import { WSHandler } from "./WSHandler";
import { resolve, join } from "path";
import { ObjectPool } from "./ObjectPool";
import { Route } from "./Route";
import { WSRoute } from "./WSRoute";
import type { ValidatedData } from "./ValidatedData";

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

  private contextPool: ObjectPool<HTTPContext>;

  constructor() {
    this.contextPool = new ObjectPool<HTTPContext>(() => new HTTPContext(), 200);
  }

  setHTTPContextPool(size: number) {
    this.contextPool.resize(size);
  }

  mount(...routes: (Route | WSRoute)[]) {
    for (const r of routes) {
      if (r instanceof Route) {
        const localMws = (r as any).middlewares || [];
        const combined = this.globalMiddlewares.concat(localMws);

        const handler = new HTTPHandler((r as any).handler, (r as any).errHandler);
        handler.setMiddlewares(combined);

        this.register(r.method, r.path, handler);
      } else if (r instanceof WSRoute) {
        const wsHandler = r.compile();
        this.register("WS", r.path, wsHandler);
      }
    }
  }

  use(...m: Middleware<HTTPContext>[]) {
    this.globalMiddlewares.push(...m);
  }

  onNotFound(h: HTTPHandlerFunc, ...m: Middleware<HTTPContext>[]) {
    const handler = new HTTPHandler(h);
    handler.setMiddlewares(this.globalMiddlewares.concat(m));
    this.notFoundHandler = handler;
  }

  onErr(h: HTTPErrorHandlerFunc, ...m: Middleware<HTTPContext>[]) {
    const wrapper: HTTPHandlerFunc = async (c: HTTPContext) => {
      const err = c.getErr();
      await h(c, err);
    };

    const handler = new HTTPHandler(wrapper);
    handler.setMiddlewares(this.globalMiddlewares.concat(m));
    this.errHandler = handler;
  }

  embed(
    pathPrefix: string,
    embeddedFiles: Record<string, { content: string | Buffer | Uint8Array | number[]; type: string }>
  ) {
    const prefix = pathPrefix === "/" ? "" : pathPrefix;

    const route = new Route("GET", prefix + "/*", async (c: HTTPContext) => {
      const lookupPath = c.path.substring(prefix.length);
      const file = embeddedFiles[lookupPath] || embeddedFiles[lookupPath + "/index.html"];

      if (!file) throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, `Asset ${lookupPath} not found`);

      c.setHeader("Content-Type", file.type);

      let bodyData = file.content;
      if (Array.isArray(bodyData)) bodyData = new Uint8Array(bodyData);

      c.res.body(bodyData);
      c.finalize();
    });

    this.mount(route);
  }

  static(pathPrefix: string, rootDir: string) {
    const prefix = pathPrefix === "/" ? "" : pathPrefix.replace(/\/+$/, "");
    const absRoot = resolve(rootDir);

    const route = new Route("GET", prefix + "/*", async (c: HTTPContext) => {
      const urlPath = c.path.substring(prefix.length);
      const relativePath = urlPath.replace(/^\/+/, "");
      const finalPath = resolve(join(absRoot, relativePath));

      if (!finalPath.startsWith(absRoot)) {
        throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, "Access Denied");
      }

      await c.file(finalPath);
    });

    this.mount(route);
  }

  private register(method: string, path: string, handlerObj: HTTPHandler | WSHandler) {
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
      return;
    }

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

  private search(
    node: TrieNode,
    parts: string[],
    index: number,
    method: string,
    params: Record<string, string>,
  ): { handler?: HTTPHandler; wsHandler?: WSHandler; params: Record<string, string> } | null {
    if (index === parts.length) {
      if (node.handlers[method] || node.wsHandler) {
        return { handler: node.handlers[method], wsHandler: node.wsHandler, params };
      }
      if (node.wildcard) {
        const wcNode = node.wildcard;
        if (wcNode.handlers[method] || wcNode.wsHandler) {
          return { handler: wcNode.handlers[method], wsHandler: wcNode.wsHandler, params };
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
        return { handler: wcNode.handlers[method], wsHandler: wcNode.wsHandler, params };
      }
    }

    return null;
  }

  find(method: string, path: string): { handler?: HTTPHandler; wsHandler?: WSHandler; params: Record<string, string> } {
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

    // -----------------------------
    // WebSocket Upgrade (pooled context)
    // -----------------------------
    if (method === "GET" && wsHandler && req.headers.get("Upgrade") === "websocket") {
      const context = this.contextPool.acquire();
      try {
        context.reset(req, params);
        context._isWS = true;
        (context as any)._wsHandler = wsHandler;

        const ok = server.upgrade(req, { data: context });
        if (ok) return;

        // If upgrade fails, release immediately
        context.clearResponse();
        this.contextPool.release(context);
        throw new SystemErr(SystemErrCode.WEBSOCKET_UPGRADE_FAILURE, "Upgrade failed");
      } catch (e) {
        // Ensure release if something goes wrong before returning
        if (context) this.contextPool.release(context);
        throw e;
      }
    }

    // -----------------------------
    // Standard HTTP request (pooled context)
    // -----------------------------
    let context: HTTPContext | undefined;

    try {
      context = this.contextPool.acquire();
      context.reset(req, params);

      if (handler) return await handler.execute(context);

      if (this.notFoundHandler) return await this.notFoundHandler.execute(context);

      throw new SystemErr(SystemErrCode.ROUTE_NOT_FOUND, `${method} ${path} is not registered`);
    } catch (e: any) {
      const c = context || new HTTPContext();
      if (!context) c.reset(req, {});

      c.clearResponse();
      c.setErr(e);

      if (e instanceof SystemErr) {
        const errHandler = SystemErrRecord[e.typeOf];
        await errHandler(c, {} as ValidatedData);
        return c.res.send();
      }

      if (this.errHandler) return await this.errHandler.execute(c);

      console.warn(
        `[XERUS WARNING] Route ${method} ${path} threw an error but has no granular error handler AND no global error handler was set via app.onErr().`,
      );
      console.error(e);

      // Unified JSON fallback
      c.errorJSON(500, SystemErrCode.INTERNAL_SERVER_ERR, "Internal Server Error", {
        detail: e?.message ?? "Unknown",
        warning: "No error handling strategy found.",
      });
      return c.res.send();
    } finally {
      if (context) this.contextPool.release(context);
    }
  }

  async listen(port: number = 8080): Promise<void> {
    const app = this;

    const server: Server<HTTPContext> = Bun.serve({
      port,
      fetch: (req, server) => app.handleHTTP(req, server),

      websocket: {
        async open(ws: ServerWebSocket<any>) {
          try {
            const handler = ws.data._wsHandler as WSHandler;
            if (handler?.compiledOpen) await handler.compiledOpen(ws);
          } catch (e: any) {
            console.error("[WS ERROR] Open:", e.message);
            ws.close(1011, "Middleware or Handler Error during Open");
          }
        },

        async message(ws: ServerWebSocket<any>, message) {
          try {
            const handler = ws.data._wsHandler as WSHandler;
            if (handler?.compiledMessage) await handler.compiledMessage(ws, message);
          } catch (e: any) {
            console.error("[WS ERROR] Message:", e.message);
            ws.close(1011, "Validation Failed");
          }
        },

        async close(ws: ServerWebSocket<any>, code, message) {
          try {
            const handler = ws.data._wsHandler as WSHandler;
            if (handler?.compiledClose) await handler.compiledClose(ws, code, message);
          } catch (e: any) {
            console.error("[WS ERROR] Close:", e.message);
          } finally {
            // ✅ WS pooling fix: release pooled HTTPContext when socket closes
            const ctx = ws.data as HTTPContext;
            if (ctx && ctx._isWS) {
              // minimal cleanup; reset will handle full cleanup on reuse
              (ctx as any)._wsHandler = undefined;
              ctx._wsMessage = null;
              ctx.setStore("_wsCloseArgs", undefined);
              app.contextPool.release(ctx);
            }
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
}
