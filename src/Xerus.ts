import type { Server, ServerWebSocket } from "bun";
import { type RouteBlueprint, TrieNode } from "./TrieNode";
import { HTTPContext } from "./HTTPContext";
import type { HTTPErrorHandlerFunc, HTTPHandlerFunc } from "./HTTPHandlerFunc";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { SystemErrRecord } from "./SystemErrRecord";
import { join, resolve } from "path";
import { ObjectPool } from "./ObjectPool";
import { XerusRoute } from "./XerusRoute";
import { Method } from "./Method";
import {
  type ServiceLifecycle,
  isRouteFieldInject,
  isRouteFieldValidator,
} from "./RouteFields";
import { errorJSON, file, setHeader } from "./std/Response";
import { WSContext } from "./WSContext";

export class Xerus {
  private root: TrieNode = new TrieNode();
  private routes: Record<string, RouteBlueprint> = {};
  private globalServices: Array<new () => ServiceLifecycle> = []; // per-request services
  private notFoundHandler?: HTTPHandlerFunc;
  private errHandler?: HTTPErrorHandlerFunc;

  // Route finding cache (method + path -> resolved params & handler)
  private resolvedRoutes = new Map<
    string,
    { blueprint?: RouteBlueprint; params: Record<string, string> }
  >();
  private readonly MAX_CACHE_SIZE = 500;

  private contextPool: ObjectPool<HTTPContext>;
  private globals = new Map<any, any>();
  private freezeValidators: boolean = true;

  constructor() {
    this.contextPool = new ObjectPool<HTTPContext>(() => new HTTPContext(), 200);
  }

  setHTTPContextPool(size: number) {
    this.contextPool.resize(size);
  }

  setFreezeValidators(enabled: boolean) {
    this.freezeValidators = !!enabled;
    return this;
  }

  use(...serviceCtors: Array<new () => ServiceLifecycle>) {
    this.globalServices.push(...serviceCtors);
  }

  usePre(...serviceCtors: Array<new () => ServiceLifecycle>) {
    this.use(...serviceCtors);
  }

  // Provide a singleton/global instance for injection
  provide<T>(Type: new (...args: any[]) => T, instance: T, storeKey?: string) {
    const key = storeKey ?? (instance as any)?.storeKey ?? Type.name;
    this.globals.set(Type, instance);
    this.globals.set(key, instance);
    return this;
  }

  // Instantiate and provide a global singleton
  async injectGlobal(...ctors: Array<new () => any>) {
    for (const Ctor of ctors) {
      const instance: any = new Ctor();
      const key = instance?.storeKey ?? Ctor.name;
      this.globals.set(Ctor, instance);
      this.globals.set(key, instance);

      // Optional: global init lifecycle
      if (instance && typeof instance.initApp === "function") {
        await instance.initApp(this);
      }
    }
    return this;
  }

  mount(...routeCtors: (new () => XerusRoute)[] | any[]) {
    for (const Ctor of routeCtors) {
      const instance = new Ctor();
      // Allow route to configure itself before mounting
      instance.onMount();

      // Capture props set during onMount or constructor
      const props: Record<string, any> = {};
      for (const k of Object.getOwnPropertyNames(instance)) {
        if (k === "_errHandler" || k === "validators" || k === "inject") continue;
        props[k] = (instance as any)[k];
      }

      const blueprint: RouteBlueprint = {
        Ctor,
        errHandler: instance._errHandler,
        mounted: { props },
      };

      this.register(instance.method, instance.path, blueprint);
    }
  }

  onNotFound(h: HTTPHandlerFunc) {
    this.notFoundHandler = h;
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
        const fileData =
          embeddedFiles[lookupPath] || embeddedFiles[lookupPath + "/index.html"];

        if (!fileData) {
          throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, `Asset ${lookupPath} not found`);
        }

        setHeader(c, "Content-Type", fileData.type);
        let bodyData = fileData.content;
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
        // Strip prefix
        const urlPath = c.path.substring(pathPrefix.length === 1 ? 0 : pathPrefix.length);
        const relativePath = urlPath.replace(/^\/+/, "");
        const finalPath = resolve(join(absRoot, relativePath));

        // Security check
        if (!finalPath.startsWith(absRoot)) {
          throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, "Access Denied");
        }

        await file(c, finalPath);
      }
    }
    this.mount(StaticRoute);
  }

  private register(method: string, path: string, blueprint: RouteBlueprint) {
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

    // Optimization for static routes
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
      // Exact match found at this depth
      if ((node.handlers as any)[method]) {
        return { blueprint: (node.handlers as any)[method], params };
      }
      if ((node as any).wsHandler) {
        return { blueprint: (node as any).wsHandler, params };
      }
      // Check for deep wildcard attached here
      if (node.wildcard) {
        const wcNode = node.wildcard;
        if ((wcNode.handlers as any)[method] || (wcNode as any).wsHandler) {
          return {
            blueprint: (wcNode.handlers as any)[method] ?? (wcNode as any).wsHandler,
            params,
          };
        }
      }
      return null;
    }

    const part = parts[index];

    // 1. Exact match
    const exactNode = node.children[part];
    if (exactNode) {
      const result = this.search(exactNode, parts, index + 1, method, { ...params });
      if (result) return result;
    }

    // 2. Param match
    const paramNode = node.children[":param"];
    if (paramNode) {
      const newParams = { ...params };
      if (paramNode.paramKey) newParams[paramNode.paramKey] = part;
      const result = this.search(paramNode, parts, index + 1, method, newParams);
      if (result) return result;
    }

    // 3. Wildcard match (greedy)
    if (node.wildcard) {
      const wcNode = node.wildcard;
      if ((wcNode.handlers as any)[method] || (wcNode as any).wsHandler) {
        return {
          blueprint: (wcNode.handlers as any)[method] ?? (wcNode as any).wsHandler,
          params,
        };
      }
    }

    return null;
  }

  find(method: string, path: string): {
    blueprint?: RouteBlueprint | any;
    params: Record<string, string>;
  } {
    const normalizedPath = path.replace(/\/+$/, "") || "/";
    const cacheKey = `${method} ${normalizedPath}`;

    // Fast path: static routes
    if (this.routes[cacheKey]) {
      return { blueprint: this.routes[cacheKey], params: {} };
    }

    // Check dynamic cache
    const cached = this.resolvedRoutes.get(cacheKey);
    if (cached) {
      // LRU-ish: move to end
      this.resolvedRoutes.delete(cacheKey);
      this.resolvedRoutes.set(cacheKey, cached);
      return cached;
    }

    const parts = normalizedPath.split("/").filter(Boolean);
    const result =
      this.search(this.root, parts, 0, method, {}) ?? {
        blueprint: undefined,
        params: {},
      };

    // Update cache
    if (this.resolvedRoutes.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.resolvedRoutes.keys().next().value;
      if (oldestKey !== undefined) this.resolvedRoutes.delete(oldestKey);
    }
    this.resolvedRoutes.set(cacheKey, result);

    return result;
  }

  private isPlainObject(x: any): boolean {
    if (!x || typeof x !== "object") return false;
    const proto = Object.getPrototypeOf(x);
    return proto === Object.prototype || proto === null;
  }

  private deepFreeze<T>(obj: T, seen: WeakSet<object> = new WeakSet()): T {
    if (!this.freezeValidators) return obj;
    if (!obj || typeof obj !== "object") return obj;

    const o: any = obj as any;
    if (seen.has(o)) return obj;
    seen.add(o);

    const isArray = Array.isArray(o);
    const isPlain = this.isPlainObject(o);
    const isClassInstance =
      !isArray &&
      !isPlain &&
      typeof o === "object" &&
      o.constructor &&
      o.constructor !== Object;

    // Only freeze arrays, plain objects, and class instances (Services/Validators)
    if (!isArray && !isPlain && !isClassInstance) return obj;

    const keys = Object.getOwnPropertyNames(o);
    for (const k of keys) {
      const v = o[k];
      if (!v || typeof v !== "object") continue;

      // Skip internal Bun/Node types to avoid errors
      const ctorName = v?.constructor?.name;
      if (
        v instanceof Request ||
        v instanceof Response ||
        v instanceof URL ||
        v instanceof Headers ||
        typeof (globalThis as any).FormData !== "undefined" && v instanceof (globalThis as any).FormData ||
        ctorName === "Blob" ||
        ctorName === "File" ||
        ctorName === "ReadableStream" ||
        ctorName === "Buffer" ||
        ctorName === "Uint8Array" ||
        ctorName === "ArrayBuffer"
      ) {
        continue;
      }
      this.deepFreeze(v, seen);
    }

    try {
      Object.freeze(o);
    } catch {
      // ignore freeze errors on certain built-ins
    }

    return obj;
  }

  private async resolveValidator(c: HTTPContext, Type: any): Promise<any> {
    let existing: any = c._getServiceCtor(Type);
    if (existing) return existing;

    existing = new Type();
    await existing.validate(c);

    if (this.freezeValidators) {
      this.deepFreeze(existing);
    }

    c._setServiceCtor(Type, existing);
    return existing;
  }

  private async resolveService(c: HTTPContext, Type: any): Promise<any> {
    let existing: any = c._getServiceCtor(Type);
    if (existing) return existing;

    existing = new Type();
    await this.resolveInstanceFields(c, existing);

    if (typeof existing.init === "function") {
      await existing.init(c);
    }

    c._setServiceCtor(Type, existing);
    return existing;
  }

private async resolveInstanceFields(c: HTTPContext, instance: any) {
    const props = Object.getOwnPropertyNames(instance);
    const X_FIELD = Symbol.for("xerus:routefield");

    for (const prop of props) {
      const val = instance[prop];
      
      // Robust check for Validator Fields
      if (val && typeof val === "object" && val["kind"] === "validator" && (val as any)[X_FIELD] === true) {
        const Type = val.Type;
        const v = await this.resolveValidator(c, Type);
        
        // Try direct assignment, fall back to defineProperty
        try {
          instance[prop] = v;
        } catch {
          Object.defineProperty(instance, prop, {
            value: v,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
        continue;
      }

      // Robust check for Inject Fields
      if (val && typeof val === "object" && val["kind"] === "inject" && (val as any)[X_FIELD] === true) {
        const { Type } = val;
        const service = await this.resolveService(c, Type);
        
        try {
          instance[prop] = service;
        } catch {
          Object.defineProperty(instance, prop, {
            value: service,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
      }
    }
  }
  private async hydrateRouteValidatorsOnly(c: HTTPContext, routeInstance: any): Promise<void> {
    const props = Object.getOwnPropertyNames(routeInstance);
    for (const prop of props) {
      const val = (routeInstance as any)[prop];
      if (!isRouteFieldValidator(val)) continue;

      const Type = val.Type;
      const v = await this.resolveValidator(c, Type);
      (routeInstance as any)[prop] = v;
    }
  }

  private async hydrateRouteServices(
    c: HTTPContext,
    routeInstance: any,
  ): Promise<ServiceLifecycle[]> {
    const services: ServiceLifecycle[] = [];
    const processedTypes = new Set<any>();

    // 1. Manual `inject` array (legacy support or explicit ordering)
    if (Array.isArray(routeInstance.inject)) {
      for (const field of routeInstance.inject) {
        if (isRouteFieldInject(field)) {
          const { Type } = field;
          if (!processedTypes.has(Type)) {
            const svc = await this.resolveService(c, Type);
            services.push(svc);
            processedTypes.add(Type);
          }
        }
      }
    }

    // 2. Instance properties decorated with Inject() or Validator.Ctx()
    const props = Object.getOwnPropertyNames(routeInstance);
    for (const prop of props) {
      const val = (routeInstance as any)[prop];

      // Validators are resolved in `hydrateRouteValidatorsOnly` BEFORE services
      if (isRouteFieldValidator(val)) {
        const Type = val.Type;
        const instance = await this.resolveValidator(c, Type);
        (routeInstance as any)[prop] = instance;
        continue;
      }

      // Services
      if (isRouteFieldInject(val)) {
        const { Type } = val;
        let svc: any;
        // reuse if already resolved in inject array
        if (processedTypes.has(Type)) {
          svc = c.service(Type);
        } else {
          svc = await this.resolveService(c, Type);
          services.push(svc);
          processedTypes.add(Type);
        }
        (routeInstance as any)[prop] = svc;
      }
    }

    return services;
  }

  private async executeRoute(blueprint: RouteBlueprint, context: HTTPContext) {
    const routeInstance = new blueprint.Ctor();

    // Copy props from mount time
    const mounted = (blueprint as any).mounted;
    if (mounted?.props && typeof mounted.props === "object") {
      for (const [k, v] of Object.entries(mounted.props)) {
        (routeInstance as any)[k] = v;
      }
    }

    // 1. Validate route-level validators (Top-level)
    await routeInstance.validate(context);
    if (context.isDone) return;

    // 2. Hydrate Route Validators (Fields) - Runs BEFORE services
    // This ensures validators are ready if services need them via context,
    // though services shouldn't access route fields directly.
    await this.hydrateRouteValidatorsOnly(context, routeInstance);
    if (context.isDone) return;

    const activeServices: ServiceLifecycle[] = [];

    try {
      // 3. Global Services
      for (const GlobalType of this.globalServices) {
        const svc = await this.resolveService(context, GlobalType);
        activeServices.push(svc);
      }

      // 4. Route Services (Injected fields)
      const routeServices = await this.hydrateRouteServices(context, routeInstance);
      activeServices.push(...routeServices);

      // 5. Lifecycle: before()
      for (const svc of activeServices) {
        if (svc.before) await svc.before(context);
        if (context.isDone) return;
      }

      // 6. Handler
      await routeInstance.preHandle(context);
      if (context.isDone) return;

      await routeInstance.handle(context);

      // 7. Lifecycle: after() (Reverse order is often better but linear here)
      await routeInstance.postHandle(context);

      for (let i = activeServices.length - 1; i >= 0; i--) {
        const svc = activeServices[i];
        if (svc.after) await svc.after(context);
      }
    } catch (err) {
      // 8. Lifecycle: onError()
      for (let i = activeServices.length - 1; i >= 0; i--) {
        const svc = activeServices[i];
        if (svc.onError) {
          await svc.onError(context, err);
          if (context.isDone) return;
        }
      }
      throw err;
    } finally {
      await routeInstance.onFinally(context);
    }
  }

  async handleHTTP(req: Request, server: Server<HTTPContext>): Promise<Response | void> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    const found = this.find(method, path);
    const blueprint = found.blueprint;
    const params = found.params;

    // WebSocket Upgrade Check
    if (
      method === "GET" &&
      blueprint &&
      (blueprint.open || blueprint.message || blueprint.close) &&
      req.headers.get("Upgrade") === "websocket"
    ) {
      const context = this.contextPool.acquire();
      try {
        context.reset(req, params);
        (context as any)._globals = this.globals;
        context._isWS = true;
        (context as any)._wsBlueprints = blueprint;

        const ok = server.upgrade(req, { data: context });
        if (ok) return;

        context.clearResponse();
        this.contextPool.release(context);
        throw new SystemErr(SystemErrCode.WEBSOCKET_UPGRADE_FAILURE, "Upgrade failed");
      } catch (e) {
        if (context) this.contextPool.release(context);
        throw e;
      }
    }

    let context: HTTPContext | undefined;
    try {
      context = this.contextPool.acquire();
      context.reset(req, params);
      (context as any)._globals = this.globals;

      if (blueprint) {
        await this.executeRoute(blueprint, context);
        const resp = context.res.send();
        context.markSent();
        return resp;
      }

      // Not Found
      if (this.notFoundHandler) {
        const activeServices: ServiceLifecycle[] = [];
        // Run global services for 404 too
        for (const GlobalType of this.globalServices) {
          const svc = await this.resolveService(context, GlobalType);
          activeServices.push(svc);
          if (svc.before) await svc.before(context);
          if (context.isDone) {
            const resp = context.res.send();
            context.markSent();
            return resp;
          }
        }

        await this.notFoundHandler(context);

        for (let i = activeServices.length - 1; i >= 0; i--) {
          const svc = activeServices[i];
          if (svc.after) await svc.after(context);
        }

        const resp = context.res.send();
        context.markSent();
        return resp;
      }

      throw new SystemErr(SystemErrCode.ROUTE_NOT_FOUND, `${method} ${path} is not registered`);
    } catch (e: any) {
      const c = context || new HTTPContext();
      if (!context) c.reset(req, {});
      (c as any)._globals = this.globals;

      c.clearResponse();
      c.err = e;

      // Handle Validation Errors standard way
      const isValidationish =
        e &&
        typeof e === "object" &&
        (e.typeOf === SystemErrCode.VALIDATION_FAILED || Array.isArray(e.issues));

      if (isValidationish) {
        const errHandler = SystemErrRecord[SystemErrCode.VALIDATION_FAILED];
        await errHandler(c, e);
        const resp = c.res.send();
        c.markSent();
        return resp;
      }

      // Handle System Errors
      if (e instanceof SystemErr) {
        const errHandler = SystemErrRecord[e.typeOf];
        await errHandler(c, e);
        const resp = c.res.send();
        c.markSent();
        return resp;
      }

      // Route-specific error handler
      if (blueprint?.errHandler) {
        try {
          await blueprint.errHandler(c, e);
          const resp = c.res.send();
          c.markSent();
          return resp;
        } catch (handlerErr: any) {
          c.clearResponse();
          c.err = handlerErr;
          // Fallthrough to global
        }
      }

      // Global error handler
      if (this.errHandler) {
        await this.errHandler(c, e);
        const resp = c.res.send();
        c.markSent();
        return resp;
      }

      console.warn(`[XERUS WARNING] Uncaught error on ${method} ${path}`);
      console.error(e);
      errorJSON(c, 500, SystemErrCode.INTERNAL_SERVER_ERR, "Internal Server Error", {
        detail: e?.message ?? "Unknown",
      });
      const resp = c.res.send();
      c.markSent();
      return resp;
    } finally {
      if (context) {
        // Handle delayed release (e.g. for long-running async work not awaited)
        const hold = context.__holdRelease;
        if (hold && typeof (hold as any).then === "function") {
          const ctx = context;
          ctx.__holdRelease = undefined;
          hold.finally(() => {
            ctx.clearResponse();
            ctx.err = undefined;
            this.contextPool.release(ctx);
          });
        } else {
          this.contextPool.release(context);
        }
      }
    }
  }

  async listen(port: number = 8080): Promise<void> {
    const app = this;

    const wsCloseOnError = (ws: ServerWebSocket<any>, err: any) => {
      const reason =
        err &&
        typeof err === "object" &&
        typeof err.message === "string" &&
        err.message.length > 0
          ? err.message.slice(0, 120)
          : "Validation failed";
      try {
        ws.close(1008, reason);
      } catch {}
    };

    const wsMethodFor = (eventName: "open" | "message" | "close" | "drain"): string => {
      switch (eventName) {
        case "open":
          return Method.WS_OPEN;
        case "message":
          return Method.WS_MESSAGE;
        case "close":
          return Method.WS_CLOSE;
        case "drain":
          return Method.WS_DRAIN;
      }
    };

    const runWS = async (
      eventName: "open" | "message" | "close" | "drain",
      ws: ServerWebSocket<any>,
      ...args: any[]
    ) => {
      const httpCtx = ws.data as HTTPContext;
      const container = (httpCtx as any)._wsBlueprints;
      const blueprint = container?.[eventName];

      if (!blueprint) return;

      httpCtx.resetForWSEvent(wsMethodFor(eventName));
      if (eventName === "message") {
        httpCtx._wsMessage = args[0] ?? null;
      } else {
        httpCtx._wsMessage = null;
      }

      let wsCtx: WSContext;
      if (eventName === "message") {
        wsCtx = new WSContext(ws, httpCtx, { message: args[0] });
      } else if (eventName === "close") {
        wsCtx = new WSContext(ws, httpCtx, { code: args[0], reason: args[1] });
      } else {
        wsCtx = new WSContext(ws, httpCtx);
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

    const server: Server<HTTPContext> = Bun.serve({
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
          const ctx = ws.data as HTTPContext;
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