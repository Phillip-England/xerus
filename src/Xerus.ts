import type { Server, ServerWebSocket } from "bun";
import { type RouteBlueprint, TrieNode } from "./TrieNode";
import { HTTPContext } from "./HTTPContext";
import type { HTTPErrorHandlerFunc, HTTPHandlerFunc } from "./HTTPHandlerFunc";
import { SystemErrCode } from "./SystemErrCode";
import { SystemErrRecord } from "./SystemErrRecord";
import { join, resolve } from "path";
import { ObjectPool } from "./ObjectPool";
import { XerusRoute, type AnyServiceCtor, type AnyValidatorCtor } from "./XerusRoute";
import { Method } from "./Method";
import type { TypeValidator } from "./XerusValidator";
import { errorJSON, file, setHeader } from "./std/Response";
import { WSContext } from "./WSContext";
import { SystemErr } from "./SystemErr";
import type { XerusPlugin } from "./XerusPlugin";

const LEGACY_FIELD = Symbol.for("xerus:routefield");
const INIT_PROMISE = Symbol.for("xerus:service_init_promise");

type ServiceCtor = AnyServiceCtor;
type ValidatorCtor<T extends TypeValidator<any> = any> = new () => T;

export class Xerus {
  private root: TrieNode = new TrieNode();
  private routes: Record<string, RouteBlueprint> = {};
  private globalServices: ServiceCtor[] = []; 
  
  // Stores blueprints for system handlers
  private notFoundBlueprint?: RouteBlueprint;
  private errBlueprint?: RouteBlueprint;

  private resolvedRoutes = new Map<
    string,
    { blueprint?: RouteBlueprint; params: Record<string, string> }
  >();
  private readonly MAX_CACHE_SIZE = 500;
  private contextPool: ObjectPool<HTTPContext>;
  private globals = new Map<any, any>();
  private freezeValidators: boolean = true;
  private plugins: XerusPlugin[] = [];
  private _server?: Server<HTTPContext>;

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

  plugin(PluginCtor: new () => XerusPlugin): this {
    const p = new PluginCtor();
    this.plugins.push(p);
    if (p.onConnect) {
      p.onConnect(this);
    }
    return this;
  }

  use(...serviceCtors: ServiceCtor[]) {
    this.globalServices.push(...serviceCtors);
  }

  usePre(...serviceCtors: ServiceCtor[]) {
    this.use(...serviceCtors);
  }

  provide<T>(Type: new (...args: any[]) => T, instance: T, storeKey?: string) {
    const key = storeKey ?? (instance as any)?.storeKey ?? Type.name;
    this.globals.set(Type, instance);
    this.globals.set(key, instance);
    return this;
  }

  async injectGlobal(...ctors: Array<new () => any>) {
    for (const Ctor of ctors) {
      const instance: any = new Ctor();
      const key = instance?.storeKey ?? Ctor.name;
      this.globals.set(Ctor, instance);
      this.globals.set(key, instance);
      if (instance && typeof instance.initApp === "function") {
        await instance.initApp(this);
      }
    }
    return this;
  }

  private assertCtorList(name: string, arr: any, where: string) {
    if (arr === undefined || arr === null) return;
    if (!Array.isArray(arr)) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        `[XERUS] ${where}.${name} must be an array of constructors.`,
      );
    }
    for (const item of arr) {
      if (item && typeof item === "object" && item[LEGACY_FIELD] === true) {
        throw new SystemErr(
          SystemErrCode.INTERNAL_SERVER_ERR,
          `[XERUS] ${where}.${name} contains legacy RouteField objects. ` +
            `Use ctor lists: ${name} = [MyCtor]`,
        );
      }
      if (typeof item !== "function") {
        throw new SystemErr(
          SystemErrCode.INTERNAL_SERVER_ERR,
          `[XERUS] ${where}.${name} must contain only constructors (classes/functions).`,
        );
      }
    }
  }

  private assertNoLegacyFields(instance: any, where: string) {
    if (Array.isArray(instance?.inject) && instance.inject.length > 0) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        `[XERUS] Legacy "inject" is not supported.\n` +
          `Use: services = [MyServiceCtor]\n` +
          `Then access via: c.service(MyServiceCtor)`,
      );
    }
    const props = Object.getOwnPropertyNames(instance);
    for (const prop of props) {
      const val = instance[prop];
      if (val && typeof val === "object" && val[LEGACY_FIELD] === true) {
        throw new SystemErr(
          SystemErrCode.INTERNAL_SERVER_ERR,
          `[XERUS] Legacy RouteField usage detected at ${where}.${prop}.\n` +
            `Use: services = [A, B] and validators = [V1, V2]`,
        );
      }
    }
    this.assertCtorList("services", instance?.services, where);
    this.assertCtorList("validators", instance?.validators, where);
  }

  private releaseContextSafely(ctx: HTTPContext) {
    const scrubAndRelease = () => {
      ctx.clearResponse();
      ctx.resetScope();
      ctx.err = undefined;
      (ctx as any)._wsBlueprints = undefined;
      ctx._wsMessage = null;
      ctx._wsContext = null;
      ctx._isWS = false;
      this.contextPool.release(ctx);
    };
    const hold = ctx.__holdRelease;
    if (hold && typeof (hold as any).then === "function") {
      ctx.__holdRelease = undefined;
      (hold as Promise<void>).finally(() => {
        scrubAndRelease();
      });
      return;
    }
    scrubAndRelease();
  }

  // FIX: Return the instance so 'mount' can use the path modified by plugins
  private createBlueprint(Ctor: new () => XerusRoute): { blueprint: RouteBlueprint, instance: XerusRoute } {
    const instance = new Ctor();
    instance.onMount();
    for(const p of this.plugins) {
      if (p.onRegister) p.onRegister(this, instance);
    }
    this.assertNoLegacyFields(instance, Ctor?.name ?? "Route");
    const SKIP_PROPS = new Set<string>([
      "_errHandler",
      "services",
      "validators",
      "inject",
      "method",
      "path",
      "onMount",
      "validate",
      "preHandle",
      "handle",
      "postHandle",
      "onFinally",
    ]);
    const props: Record<string, any> = {};
    const descriptors = Object.getOwnPropertyDescriptors(instance);
    for (const [k, desc] of Object.entries(descriptors)) {
      if (SKIP_PROPS.has(k)) continue;
      if (typeof desc.get === "function" || typeof desc.set === "function") continue;
      const v = desc.value;
      if (typeof v === "function") continue;
      props[k] = v;
    }
    
    const blueprint: RouteBlueprint = {
      Ctor,
      errHandler: instance._errHandler,
      mounted: { props },
      services: (instance.services ?? []) as any,
      validators: (instance.validators ?? []) as any,
    };

    return { blueprint, instance };
  }

  mount(...routeCtors: (new () => XerusRoute)[] | any[]) {
    for (const Ctor of routeCtors) {
      // FIX: Use the instance returned by createBlueprint (plugins may have mutated it)
      const { blueprint, instance } = this.createBlueprint(Ctor);
      this.register(instance.method, instance.path, blueprint);
    }
  }

  onNotFound(RouteCtor: new () => XerusRoute) {
    const { blueprint } = this.createBlueprint(RouteCtor);
    this.notFoundBlueprint = blueprint;
  }

  onErr(RouteCtor: new () => XerusRoute) {
    const { blueprint } = this.createBlueprint(RouteCtor);
    this.errBlueprint = blueprint;
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
        const urlPath = c.path.substring(pathPrefix.length === 1 ? 0 : pathPrefix.length);
        const relativePath = urlPath.replace(/^\/+/, "");
        const finalPath = resolve(join(absRoot, relativePath));
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
      if (method === Method.OPTIONS) {
        const availableMethods = Object.keys(node.handlers);
        if (availableMethods.length > 0) {
          return { blueprint: node.handlers[availableMethods[0]], params };
        }
      }
      if (node.wildcard) {
        const wcNode = node.wildcard;
        if ((wcNode.handlers as any)[method]) {
          return { blueprint: (wcNode.handlers as any)[method], params };
        }
        if ((wcNode as any).wsHandler) {
          return { blueprint: (wcNode as any).wsHandler, params };
        }
        if (method === Method.OPTIONS) {
          const availableMethods = Object.keys(wcNode.handlers);
          if (availableMethods.length > 0) {
            return { blueprint: wcNode.handlers[availableMethods[0]], params };
          }
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
      if ((wcNode.handlers as any)[method]) {
        return { blueprint: (wcNode.handlers as any)[method], params };
      }
      if ((wcNode as any).wsHandler) {
        return { blueprint: (wcNode as any).wsHandler, params };
      }
      if (method === Method.OPTIONS) {
        const availableMethods = Object.keys(wcNode.handlers);
        if (availableMethods.length > 0) {
          return { blueprint: wcNode.handlers[availableMethods[0]], params };
        }
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
    const result =
      this.search(this.root, parts, 0, method, {}) ?? {
        blueprint: undefined,
        params: {},
      };
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
    if (!isArray && !isPlain) return obj;
    const keys = Object.getOwnPropertyNames(o);
    for (const k of keys) {
      const v = o[k];
      if (!v || typeof v !== "object") continue;
      const ctorName = v?.constructor?.name;
      if (
        v instanceof Request ||
        v instanceof Response ||
        v instanceof URL ||
        v instanceof Headers ||
        (typeof (globalThis as any).FormData !== "undefined" &&
          v instanceof (globalThis as any).FormData) ||
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
    } catch {}
    return obj;
  }

  private async resolveValidatorValue(c: HTTPContext, Type: ValidatorCtor): Promise<any> {
    if ((c as any)._hasValidatedCtor(Type)) {
      return (c as any)._getValidatedCtor(Type);
    }
    const inst: any = new Type();
    const value = await inst.validate(c);
    if (value === undefined) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        `[XERUS] Validator ${Type?.name ?? "UnknownValidator"} did not return a value.\n` +
          `Validators must return the validated value (this is what c.validated(...) returns).\n` +
          `If you need access to raw input later, include it in your return value.`,
      );
    }
    const stored = this.freezeValidators ? this.deepFreeze(value) : value;
    (c as any)._setValidatedCtor(Type, stored);
    return stored;
  }

  private async resolveService(c: HTTPContext, Type: ServiceCtor): Promise<any> {
    if ((c as any)._hasServiceCtor(Type)) {
      const existing = (c as any)._getServiceCtor(Type);
      const p = existing?.[INIT_PROMISE];
      if (p && typeof p.then === "function") {
        await p;
      }
      return existing;
    }
    const inst: any = new Type();
    this.assertNoLegacyFields(inst, Type?.name ?? "Service");
    (c as any)._setServiceCtor(Type, inst);
    const initPromise = (async () => {
      const deps: ServiceCtor[] = Array.isArray(inst.services) ? inst.services : [];
      this.assertCtorList("services", deps, Type?.name ?? "Service");
      for (const Dep of deps) {
        await this.resolveService(c, Dep);
      }
      const vdeps: ValidatorCtor[] = Array.isArray(inst.validators) ? inst.validators : [];
      this.assertCtorList("validators", vdeps, Type?.name ?? "Service");
      for (const V of vdeps) {
        await this.resolveValidatorValue(c, V);
      }
      if (typeof inst.init === "function") {
        await inst.init(c);
      }
    })();
    inst[INIT_PROMISE] = initPromise;
    await initPromise;
    return inst;
  }

  private async activateServices(c: HTTPContext, roots: ServiceCtor[]): Promise<any[]> {
    const ordered: any[] = [];
    const seen = new Set<any>();
    const visit = async (Type: ServiceCtor) => {
      if (seen.has(Type)) return;
      seen.add(Type);
      const inst: any = await this.resolveService(c, Type);
      const deps: ServiceCtor[] = Array.isArray(inst?.services) ? inst.services : [];
      for (const Dep of deps) {
        await visit(Dep);
      }
      ordered.push(inst);
    };
    for (const Root of roots) {
      await visit(Root);
    }
    return ordered;
  }

  private async runValidators(c: HTTPContext, validators: ValidatorCtor[], where: string) {
    this.assertCtorList("validators", validators, where);
    for (const V of validators) {
      await this.resolveValidatorValue(c, V);
      if (c.isDone) return;
    }
  }

  private async executeRoute(blueprint: RouteBlueprint, context: HTTPContext) {
    const routeInstance = new blueprint.Ctor();
    const mounted = (blueprint as any).mounted;
    if (mounted?.props && typeof mounted.props === "object") {
      for (const [k, v] of Object.entries(mounted.props)) {
        (routeInstance as any)[k] = v;
      }
    }
    this.assertNoLegacyFields(routeInstance, blueprint.Ctor?.name ?? "Route");
    const routeValidators = (blueprint.validators ??
      (routeInstance as any).validators ??
      []) as ValidatorCtor[];
    await this.runValidators(context, routeValidators, blueprint.Ctor?.name ?? "Route");
    if (context.isDone) return;
    await routeInstance.validate(context);
    if (context.isDone) return;
    const serviceRoots: ServiceCtor[] = [
      ...(this.globalServices ?? []),
      ...(((blueprint.services ?? (routeInstance as any).services ?? []) as any[]) ?? []),
    ] as ServiceCtor[];
    this.assertCtorList("services", serviceRoots, blueprint.Ctor?.name ?? "Route");
    const activeServices = await this.activateServices(context, serviceRoots);
    try {
      for (const svc of activeServices) {
        if (typeof svc.before === "function") await svc.before(context);
        if (context.isDone) return;
      }
      await routeInstance.preHandle(context);
      if (context.isDone) return;
      await routeInstance.handle(context);
      await routeInstance.postHandle(context);
      for (let i = activeServices.length - 1; i >= 0; i--) {
        const svc = activeServices[i];
        if (typeof svc.after === "function") await svc.after(context);
      }
    } catch (err) {
      for (let i = activeServices.length - 1; i >= 0; i--) {
        const svc = activeServices[i];
        if (typeof svc.onError === "function") {
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
        this.releaseContextSafely(context);
        throw new SystemErr(SystemErrCode.WEBSOCKET_UPGRADE_FAILURE, "Upgrade failed");
      } catch (e) {
        this.releaseContextSafely(context);
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

      if (this.notFoundBlueprint) {
        await this.executeRoute(this.notFoundBlueprint, context);
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

      const isSystemValidation =
        e instanceof SystemErr && e.typeOf === SystemErrCode.VALIDATION_FAILED;
      const isZodValidation =
        e &&
        typeof e === "object" &&
        (e.name === "ZodError" || e.constructor?.name === "ZodError") &&
        Array.isArray((e as any).issues);

      if (isSystemValidation || isZodValidation) {
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
          c.err = handlerErr;
        }
      }

      if (this.errBlueprint) {
        try {
          await this.executeRoute(this.errBlueprint, c);
          const resp = c.res.send();
          c.markSent();
          return resp;
        } catch(fallbackErr) {
           console.error("Error inside custom Error Handler:", fallbackErr);
        }
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
        this.releaseContextSafely(context);
      }
    }
  }

  async shutdown() {
    if (this._server) {
      this._server.stop();
    }
    for (const p of this.plugins) {
      if (p.onShutdown) await p.onShutdown(this);
    }
  }

  async listen(port: number = 8080): Promise<Server<HTTPContext>> {
    for (const p of this.plugins) {
      if (p.onPreListen) await p.onPreListen(this);
    }
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
            app.releaseContextSafely(ctx);
          }
        },
        async drain(ws) {
          await runWS("drain", ws);
        },
      },
    });
    this._server = server;
    const shutdownHandler = async () => {
      console.log(`\n[Xerus] Shutting down...`);
      await this.shutdown();
      process.exit(0);
    };
    process.on("SIGINT", shutdownHandler);
    process.on("SIGTERM", shutdownHandler);
    console.log(`🚀 Server running on ${server.port}`);
    return server;
  }
}