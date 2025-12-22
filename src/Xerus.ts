import type { Server, ServerWebSocket } from "bun";
import { TrieNode, type RouteBlueprint } from "./TrieNode";
import { Middleware } from "./Middleware";
import type { XerusMiddleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import type { HTTPHandlerFunc, HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { SystemErrRecord } from "./SystemErrRecord";
import { join, resolve } from "path";
import { ObjectPool } from "./ObjectPool";
import { XerusRoute } from "./XerusRoute";
import { Method } from "./Method";
import { WSContext } from "./WSContext";
import { Validator } from "./Validator";
import {
  type InjectableStore,
  isRouteFieldInject,
  isRouteFieldValidator,
} from "./RouteFields";

type AnyCtx<T extends Record<string, any>> = HTTPContext<T>;
type MiddlewareInput<T extends Record<string, any>> = 
  | XerusMiddleware<T>
  | (new (...args: any[]) => XerusMiddleware<T>);


function isCtor(x: any): x is new (...args: any[]) => any {
    return typeof x === "function" && x.prototype && x.prototype.constructor === x;
}

export class Xerus<T extends Record<string, any> = Record<string, any>> {
  private root: TrieNode = new TrieNode();
  private routes: Record<string, RouteBlueprint> = {};
  private preMiddlewares: XerusMiddleware<T>[] = []; // runs before Inject/Validate fields
  private globalMiddlewares: XerusMiddleware<T>[] = []; // runs after Inject/Validate fields
  private notFoundHandler?: HTTPHandlerFunc;
  private errHandler?: HTTPErrorHandlerFunc;
  private resolvedRoutes = new Map<
    string,
    { blueprint?: RouteBlueprint; params: Record<string, string> }
  >();
  private readonly MAX_CACHE_SIZE = 500;
  private contextPool: ObjectPool<HTTPContext<T>>;

  constructor() {
    this.contextPool = new ObjectPool<HTTPContext<T>>(
      () => new HTTPContext<T>(),
      200,
    );
  }

  setHTTPContextPool(size: number) {
    this.contextPool.resize(size);
  }

  private normalizeMiddlewares(list: MiddlewareInput<T>[]): XerusMiddleware<T>[] {
    return list.map((m) => {
        if (isCtor(m)) {
            return new m();
        }
        return m as XerusMiddleware<T>;
    });
  }

  usePre(...m: MiddlewareInput<T>[]) {
    this.preMiddlewares.push(...this.normalizeMiddlewares(m));
  }

  use(...m: MiddlewareInput<T>[]) {
    this.globalMiddlewares.push(...this.normalizeMiddlewares(m));
  }

  inject(...storeCtors: Array<new () => InjectableStore>) {
    for (const Ctor of storeCtors) {
      this.usePre(
        new Middleware<any>(async (http: HTTPContext<T>, next) => {
          const instance: any = new Ctor();
          const key = instance?.storeKey ?? Ctor.name;
          if (instance && typeof instance.init === "function") {
            await instance.init(http as any);
          }
          http.setStore(key, instance);
          await next();
        }),
      );
    }
  }

mount(...routeCtors: (new () => XerusRoute<T>)[] | any[]) {
  for (const Ctor of routeCtors) {
    const instance = new Ctor();
    instance.onMount();

    // ✅ Snapshot all own props after onMount (including mutated path, config fields, etc.)
    const props: Record<string, any> = {};
    for (const k of Object.getOwnPropertyNames(instance)) {
      // exclude internal runtime chains; those are handled by blueprint
if (
  k === "_middlewares" ||
  k === "_errHandler" ||
  k === "validators" // avoid copying runtime validator arrays
) continue;

      props[k] = (instance as any)[k];
    }

    const blueprint: RouteBlueprint = {
      Ctor,
      middlewares: this.globalMiddlewares.concat(instance._middlewares),
      errHandler: instance._errHandler,

      mounted: { props },
    };

    this.register(instance.method, instance.path, blueprint);
  }
}


  onNotFound(h: HTTPHandlerFunc, ...m: MiddlewareInput<T>[]) {
    this.notFoundHandler = async (c) => {
      const chain = this.preMiddlewares.concat(this.globalMiddlewares).concat(
        this.normalizeMiddlewares(m),
      );
      await this.runMiddlewareChain(chain, c as any, async () => {
        await h(c);
      });
    };
  }

  onErr(h: HTTPErrorHandlerFunc) {
    this.errHandler = h;
  }

  embed(
    pathPrefix: string,
    embeddedFiles: Record<
      string,
      { content: string | Buffer | Uint8Array | number[]; type: string }
    >,
  ) {
    class EmbedRoute extends XerusRoute {
      method = Method.GET;
      path = pathPrefix === "/" ? "/*" : pathPrefix + "/*";
      async handle(c: HTTPContext) {
        const lookupPath = c.path.substring(pathPrefix.length);
        const file = embeddedFiles[lookupPath] ||
          embeddedFiles[lookupPath + "/index.html"];
        if (!file) {
          throw new SystemErr(
            SystemErrCode.FILE_NOT_FOUND,
            `Asset ${lookupPath} not found`,
          );
        }
        c.setHeader("Content-Type", file.type);
        let bodyData = file.content;
        if (Array.isArray(bodyData)) bodyData = new Uint8Array(bodyData);
        c.res.body(bodyData);
        c.finalize();
      }
    }
    this.mount(EmbedRoute);
  }

  static(pathPrefix: string, rootDir: string) {
    const absRoot = resolve(rootDir);
    class StaticRoute extends XerusRoute {
      method = Method.GET;
      path = pathPrefix === "/" ? "/*" : pathPrefix.replace(/\/+$/, "") + "/*";
      async handle(c: HTTPContext) {
        const urlPath = c.path.substring(
          pathPrefix.length === 1 ? 0 : pathPrefix.length,
        );
        const relativePath = urlPath.replace(/^\/+/, "");
        const finalPath = resolve(join(absRoot, relativePath));

        if (!finalPath.startsWith(absRoot)) {
          throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, "Access Denied");
        }

        await c.file(finalPath);
      }
    }
    this.mount(StaticRoute);
  }

  private register(method: string, path: string, blueprint: RouteBlueprint) {
    const parts = path.split("/").filter(Boolean);
    let node = this.root;
    for (const part of parts) {
      if (part.startsWith(":")) {
        node = node.children[":param"] ??
          (node.children[":param"] = new TrieNode());
        node.paramKey ||= part.slice(1);
      } else if (part === "*") {
        node.wildcard = node.wildcard ?? new TrieNode();
        node = node.wildcard;
      } else {
        node = node.children[part] ?? (node.children[part] = new TrieNode());
      }
    }

    const isWS = [
      Method.WS_OPEN,
      Method.WS_MESSAGE,
      Method.WS_CLOSE,
      Method.WS_DRAIN,
    ].includes(method as Method);

    if (isWS) {
      if (!(node as any).wsHandler) {
        (node as any).wsHandler = {
          open: undefined,
          message: undefined,
          close: undefined,
          drain: undefined,
        };
      }
      const container = (node as any).wsHandler;
      switch (method) {
        case Method.WS_OPEN:
          container.open = blueprint;
          break;
        case Method.WS_MESSAGE:
          container.message = blueprint;
          break;
        case Method.WS_CLOSE:
          container.close = blueprint;
          break;
        case Method.WS_DRAIN:
          container.drain = blueprint;
          break;
      }
      return;
    }

    if ((node.handlers as any)[method]) {
      throw new SystemErr(
        SystemErrCode.ROUTE_ALREADY_REGISTERED,
        `Route ${method} ${path} has already been registered`,
      );
    }
    (node.handlers as any)[method] = blueprint;
    if (!path.includes(":") && !path.includes("*")) {
      this.routes[`${method} ${path}`] = blueprint;
    }
  }

  private search(
    node: TrieNode,
    parts: string[],
    index: number,
    method: string,
    params: Record<string, string>,
  ): { blueprint?: RouteBlueprint; params: Record<string, string> } | null {
    if (index === parts.length) {
      if ((node.handlers as any)[method]) {
        return { blueprint: (node.handlers as any)[method], params };
      }
      if ((node as any).wsHandler) {
        return { blueprint: (node as any).wsHandler, params };
      }
      if (node.wildcard) {
        const wcNode = node.wildcard;
        if ((wcNode.handlers as any)[method] || (wcNode as any).wsHandler) {
          return {
            blueprint: (wcNode.handlers as any)[method] ??
              (wcNode as any).wsHandler,
            params,
          };
        }
      }
      return null;
    }

    const part = parts[index];
    const exactNode = node.children[part];
    if (exactNode) {
      const result = this.search(exactNode, parts, index + 1, method, {
        ...params,
      });
      if (result) return result;
    }

    const paramNode = node.children[":param"];
    if (paramNode) {
      const newParams = { ...params };
      if (paramNode.paramKey) newParams[paramNode.paramKey] = part;
      const result = this.search(
        paramNode,
        parts,
        index + 1,
        method,
        newParams,
      );
      if (result) return result;
    }

    if (node.wildcard) {
      const wcNode = node.wildcard;
      if ((wcNode.handlers as any)[method] || (wcNode as any).wsHandler) {
        return {
          blueprint: (wcNode.handlers as any)[method] ??
            (wcNode as any).wsHandler,
          params,
        };
      }
    }
    return null;
  }

  find(
    method: string,
    path: string,
  ): { blueprint?: RouteBlueprint | any; params: Record<string, string> } {
    const normalizedPath = path.replace(/\/+$/, "") || "/";
    const cacheKey = `${method} ${normalizedPath}`;
    if (this.routes[cacheKey]) {
      return { blueprint: this.routes[cacheKey], params: {} };
    }

    const cached = this.resolvedRoutes.get(cacheKey);
    if (cached) {
      this.resolvedRoutes.delete(cacheKey);
      this.resolvedRoutes.set(cacheKey, cached);
      return cached;
    }

    const parts = normalizedPath.split("/").filter(Boolean);
    const result = this.search(this.root, parts, 0, method, {}) ??
      { blueprint: undefined, params: {} };

    if (this.resolvedRoutes.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.resolvedRoutes.keys().next().value;
      if (oldestKey !== undefined) this.resolvedRoutes.delete(oldestKey);
    }
    this.resolvedRoutes.set(cacheKey, result);
    return result;
  }

  private async runMiddlewareChain(
    middlewares: XerusMiddleware<T>[],
    context: AnyCtx<T>,
    finalHandler: () => Promise<void>,
  ) {
    let index = -1;
    const httpCtx = context;

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) {
        throw new SystemErr(
          SystemErrCode.MIDDLEWARE_ERROR,
          "next() called multiple times",
        );
      }
      index = i;
      if (i === middlewares.length) {
        await finalHandler();
        return;
      }

      const mw = middlewares[i];
      let nextCalled = false;
      let nextFinished = false;

      const nextWrapper = async () => {
        nextCalled = true;
        try {
          await dispatch(i + 1);
        } finally {
          nextFinished = true;
        }
      };

      await mw.execute(context as any, nextWrapper);

      if (nextCalled && !nextFinished && !httpCtx.isDone) {
        (httpCtx as any).__tainted = true;
        throw new SystemErr(
          SystemErrCode.MIDDLEWARE_ERROR,
          `Middleware at index ${i} did not await next()`,
        );
      }
    };

    await dispatch(0);
  }

  private collectRouteFieldMiddlewares(routeInstance: any): {
    injectMws: XerusMiddleware<any>[];
    validatorMws: XerusMiddleware<any>[];
  } {
    const injectMws: XerusMiddleware<any>[] = [];
    const validatorMws: XerusMiddleware<any>[] = [];
    const props = Object.getOwnPropertyNames(routeInstance);

    for (const prop of props) {
      const val = (routeInstance as any)[prop];

      if (isRouteFieldInject(val)) {
        const Type = val.Type;
        const storeKey = val.storeKey;
        const mw = new Middleware<any>(async (c: HTTPContext<any>, next) => {
            const instance: any = new Type();
            const key = storeKey ??
                instance?.storeKey ??
                Type?.name ??
                prop;
            if (instance && typeof instance.init === "function") {
                await instance.init(c);
            }
            c.setStore(key, instance);
            (routeInstance as any)[prop] = instance;
            await next();
        });
        injectMws.push(mw);
        continue;
      }

      if (isRouteFieldValidator(val)) {
const v = new Validator(val.source, val.Type, val.storeKey ?? prop);
const mw = new Middleware<any>(async (c: HTTPContext<any>, next) => {
  const instance = await v.run(c);
  (routeInstance as any)[prop] = instance;
  await next();
});
validatorMws.push(mw);

        continue;
      }
    }
    return { injectMws, validatorMws };
  }

  private async executeRoute(
    blueprint: RouteBlueprint,
    context: HTTPContext<T>,
  ) {
    const httpCtx = context;
const routeInstance = new blueprint.Ctor();

// ✅ Apply mount-time snapshot so request instance matches mount instance
const mounted = (blueprint as any).mounted;
if (mounted?.props && typeof mounted.props === "object") {
  for (const [k, v] of Object.entries(mounted.props)) {
    (routeInstance as any)[k] = v;
  }
}

const { injectMws, validatorMws } = this.collectRouteFieldMiddlewares(routeInstance);


    const preHandleMw: XerusMiddleware<any> = new Middleware<any>(
      async (_c, next) => {
        await routeInstance.preHandle(context as any);
        await next();
      },
    );

    const finalHandler = async () => {
      if (httpCtx.isDone && !httpCtx._isWS) return;
      await routeInstance.handle(context as any);
      await routeInstance.postHandle(context as any);
    };

    const fullChain = this.preMiddlewares
      .concat(injectMws)
      .concat(validatorMws)
      .concat([preHandleMw])
      .concat(blueprint.middlewares);

    try {
      await this.runMiddlewareChain(fullChain, context, finalHandler);
    } finally {
      await routeInstance.onFinally(context as any);
    }
  }

  async handleHTTP(
    req: Request,
    server: Server<HTTPContext<T>>,
  ): Promise<Response | void> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    const found = this.find(method, path);
    const blueprint = found.blueprint;
    const params = found.params;

    if (
      method === "GET" &&
      blueprint &&
      (blueprint.open || blueprint.message || blueprint.close) &&
      req.headers.get("Upgrade") === "websocket"
    ) {
      const context = this.contextPool.acquire();
      try {
        context.reset(req, params);
        context._isWS = true;
        (context as any)._wsBlueprints = blueprint;
        const ok = server.upgrade(req, { data: context });
        if (ok) return;

        context.clearResponse();
        this.contextPool.release(context);
        throw new SystemErr(
          SystemErrCode.WEBSOCKET_UPGRADE_FAILURE,
          "Upgrade failed",
        );
      } catch (e) {
        if (context) this.contextPool.release(context);
        throw e;
      }
    }

    let context: HTTPContext<T> | undefined;

    try {
      context = this.contextPool.acquire();
      context.reset(req, params);

      if (blueprint) {
        await this.executeRoute(blueprint, context);
        const resp = context.res.send();
        context.markSent();
        return resp;
      }

      if (this.notFoundHandler) {
        await this.notFoundHandler(context);
        const resp = context.res.send();
        context.markSent();
        return resp;
      }

      throw new SystemErr(
        SystemErrCode.ROUTE_NOT_FOUND,
        `${method} ${path} is not registered`,
      );
    } catch (e: any) {
      const c = context || new HTTPContext<T>();
      if (!context) c.reset(req, {});
      c.clearResponse();
      c.setErr(e);

      const isValidationish = e && typeof e === "object" &&
        (e.typeOf === SystemErrCode.VALIDATION_FAILED ||
          Array.isArray(e.issues));

      if (isValidationish) {
        const errHandler = SystemErrRecord[SystemErrCode.VALIDATION_FAILED];
        await errHandler(c, e);
        const resp = c.res.send();
        c.markSent();
        return resp;
      }

      if (e instanceof SystemErr) {
        const errHandler = SystemErrRecord[e.typeOf];
        await errHandler(c, e);
        const resp = c.res.send();
        c.markSent();
        return resp;
      }

      if (blueprint?.errHandler) {
        try {
          await blueprint.errHandler(c, e);
          const resp = c.res.send();
          c.markSent();
          return resp;
        } catch (handlerErr: any) {
          c.clearResponse();
          c.setErr(handlerErr);
        }
      }

      if (this.errHandler) {
        await this.errHandler(c, e);
        const resp = c.res.send();
        c.markSent();
        return resp;
      }

      console.warn(`[XERUS WARNING] Uncaught error on ${method} ${path}`);
      console.error(e);

      c.errorJSON(
        500,
        SystemErrCode.INTERNAL_SERVER_ERR,
        "Internal Server Error",
        {
          detail: e?.message ?? "Unknown",
        },
      );
      const resp = c.res.send();
      c.markSent();
      return resp;
    } finally {
      if (context) {
        if ((context as any).__tainted) {
          // If tainted, do not return to pool or check holds
        } else {
          const hold = (context.data as any)?.__holdRelease;
          if (hold && typeof (hold as any).then === "function") {
            delete (context.data as any).__holdRelease;
            const ctx = context;
            (hold as Promise<void>).finally(() => {
              ctx.clearResponse();
              ctx.setErr(undefined);
              this.contextPool.release(ctx);
            });
          } else {
            this.contextPool.release(context);
          }
        }
      }
    }
  }

  async listen(port: number = 8080): Promise<void> {
    const app = this;
    const wsCloseOnError = (ws: ServerWebSocket<any>, err: any) => {
      const reason =
        err && typeof err === "object" && typeof err.message === "string" &&
          err.message.length > 0
          ? err.message.slice(0, 120)
          : "Validation failed";
      try {
        ws.close(1008, reason);
      } catch {}
    };

 const runWS = async (
  eventName: "open" | "message" | "close" | "drain",
  ws: ServerWebSocket<any>,
  ...args: any[]
) => {
  const httpCtx = ws.data as HTTPContext<T>;
  const container = (httpCtx as any)._wsBlueprints;
  const blueprint = container?.[eventName];
  if (!blueprint) return;

  // ✅ RESET RESPONSE STATE PER WS EVENT
  // Keep store/data/params, but reset response guards + errors/timeouts.
  httpCtx.clearResponse();
  httpCtx.setErr(undefined);

  // clear per-request timeout markers if they exist
  if (httpCtx.data && typeof httpCtx.data === "object") {
    delete (httpCtx.data as any).__timeoutSent;
    delete (httpCtx.data as any).__holdRelease;
  }

  if (eventName === "message") {
    httpCtx._wsMessage = args[0] ?? null;
  } else {
    httpCtx._wsMessage = null;
  }

  let wsCtx: WSContext<T>;
  if (eventName === "message") {
    wsCtx = new WSContext<T>(ws, httpCtx, { message: args[0] });
  } else if (eventName === "close") {
    wsCtx = new WSContext<T>(ws, httpCtx, {
      code: args[0],
      reason: args[1],
    });
  } else {
    wsCtx = new WSContext<T>(ws, httpCtx);
  }

  httpCtx._wsContext = wsCtx;

  try {
    await app.executeRoute(blueprint, httpCtx);
  } catch (e: any) {
    if (blueprint?.errHandler) {
      try {
        await blueprint.errHandler(httpCtx, e);
        if ((ws as any).readyState === 1) wsCloseOnError(ws, e);
        return;
      } catch (handlerErr: any) {
        e = handlerErr;
      }
    }
    wsCloseOnError(ws, e);
  } finally {
    httpCtx._wsMessage = null;
    httpCtx._wsContext = null;
  }
};

    const server: Server<HTTPContext<T>> = Bun.serve({
      port,
      fetch: (req, server) => app.handleHTTP(req, server),
      websocket: {
        async open(ws) {
          await runWS("open", ws);
        },
        async message(ws, msg) {
          await runWS("message", ws, msg);
        },
        async close(ws, code, reason) {
          await runWS("close", ws, code, reason);
          const ctx = ws.data as HTTPContext<T>;
          if (ctx) {
            (ctx as any)._wsBlueprints = undefined;
            app.contextPool.release(ctx);
          }
        },
        async drain(ws) {
          await runWS("drain", ws);
        },
      },
    });

    console.log(`🚀 Server running on ${server.port}`);
  }
}