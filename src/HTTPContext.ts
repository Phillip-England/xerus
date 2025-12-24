// --- START FILE: src/HTTPContext.ts ---
import { MutResponse } from "./MutResponse";
import { ContextState } from "./ContextState";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { RequestCookies, ResponseCookies } from "./Cookies";
import { RequestHeaders } from "./Headers";
import { createDataBag, type DataBag } from "./DataBag";
import type { WSContext } from "./WSContext";

export type ParsedBodyMode = "NONE" | "TEXT" | "JSON" | "FORM" | "MULTIPART";

type Ctor<T> = new (...args: any[]) => T;

export class HTTPContext {
  req!: Request;
  res: MutResponse;

  /**
   * Per-request scope data bag (validators/services/etc).
   * Consider this internal; prefer c.service(Type) for resolved services.
   */
  data: DataBag;

  /**
   * Preferred alias for “scoped per-request instances”
   * (keeps old `data` but gives you a nicer public name)
   */
  get scoped(): DataBag {
    return this.data;
  }

  path: string = "/";
  method: string = "GET";
  route: string = "";
  params: Record<string, string> = {};

  _url: URL | null = null;
  _segments: string[] | null = null;
  _reqHeaders: RequestHeaders | null = null;

  _reqCookiesView: RequestCookies | null = null;
  _resCookiesWriter: ResponseCookies | null = null;

  _body?: unknown;
  _rawBody: string | null = null;
  _parsedBodyMode: ParsedBodyMode = "NONE";

  _wsMessage: string | Buffer | null = null;
  _wsContext: WSContext | null = null;
  _isWS: boolean = false;

  _state: ContextState = ContextState.OPEN;

  _store: Map<string, any> = new Map();

  /**
   * Global registry injected by Xerus (app singletons, etc.)
   */
  _globals: Map<any, any> | null = null;

  public err: Error | undefined | string;
  public __timeoutSent?: boolean;
  public __holdRelease?: Promise<void>;

  constructor() {
    this.res = new MutResponse();
    this.data = createDataBag();
  }

  reset(req: Request, params: Record<string, string> = {}) {
    this.req = req;
    this.res.reset();
    this._state = ContextState.OPEN;

    this._url = null;
    this._segments = null;
    this.params = params;

    this._body = undefined;
    this._rawBody = null;
    this._parsedBodyMode = "NONE";

    this.err = undefined;
    this._wsMessage = null;
    this._wsContext = null;

    // per-request scope
    this.data.clear();
    this._store.clear();

    this._isWS = false;

    this.__timeoutSent = undefined;
    this.__holdRelease = undefined;

    const u = new URL(req.url);
    this.path = u.pathname.replace(/\/+$/, "") || "/";
    this.method = this.req.method;
    this.route = `${this.method} ${this.path}`;

    this._reqHeaders = new RequestHeaders(req.headers);

    // reset cookie jar request header for this request
    this.res.cookies.resetRequest(req.headers.get("Cookie"));
    this._reqCookiesView = null;
    this._resCookiesWriter = null;
  }

  /**
   * Clears per-request/per-event scope WITHOUT touching req/url/path/params.
   * Use this for WS events to avoid stale state with pooled contexts.
   */
  resetScope(): void {
    this.data.clear();
    this._store.clear();
    this._body = undefined;
    this._rawBody = null;
    this._parsedBodyMode = "NONE";
  }

  /**
   * Resets everything that should be fresh for each WS event
   * while keeping the underlying upgrade Request + path.
   */
  resetForWSEvent(wsMethod: string): void {
    // response + lifecycle bits
    this.clearResponse();
    this.err = undefined;
    this.__timeoutSent = undefined;
    this.__holdRelease = undefined;

    // per-event scope safety
    this.resetScope();

    // Update method/route for logging + route string correctness
    this.method = wsMethod;
    this.route = `${this.method} ${this.path}`;
  }

  get isDone(): boolean {
    return this._state !== ContextState.OPEN;
  }

  markSent() {
    this._state = ContextState.SENT;
  }

  finalize() {
    if (this._state === ContextState.OPEN) this._state = ContextState.WRITTEN;
  }

  clearResponse() {
    this.res.reset();
    this._state = ContextState.OPEN;
  }

  /**
   * Canonical store API (replaces WSContext-only access).
   */
  getStore<TVal = any>(key: string): TVal {
    return this._store.get(key) as TVal;
  }

  setStore(key: string, value: any): void {
    this._store.set(key, value);
  }

  deleteStore(key: string): void {
    this._store.delete(key);
  }

  clearStore(): void {
    this._store.clear();
  }

  /**
   * Ergonomic store surface:
   *   c.store.get("x")
   *   c.store.set("x", 123)
   */
  get store() {
    const c = this;
    return {
      get<TVal = any>(key: string): TVal {
        return c.getStore<TVal>(key);
      },
      set(key: string, value: any): void {
        c.setStore(key, value);
      },
      delete(key: string): void {
        c.deleteStore(key);
      },
      clear(): void {
        c.clearStore();
      },
    };
  }

  /**
   * Canonical cookies surface:
   *   c.cookies.request.get(...)
   *   c.cookies.response.set(...)
   */
  get cookies() {
    if (!this._reqCookiesView) this._reqCookiesView = new RequestCookies(this.res.cookies);
    if (!this._resCookiesWriter) this._resCookiesWriter = new ResponseCookies(this.res.cookies);
    return {
      request: this._reqCookiesView,
      response: this._resCookiesWriter,
    };
  }

  /**
   * Request-scoped service accessor.
   * This requires the Type to have been resolved into this request scope.
   */
  service<T>(Type: Ctor<T>): T {
    const v = this.data.getCtor(Type);
    if (!v) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        `Service not available on context: ${Type?.name ?? "UnknownType"}`,
      );
    }
    return v as T;
  }

  /**
   * App-global singleton accessor.
   * Xerus attaches `_globals` when handling requests / upgrading websockets.
   */
  global<T>(Type: Ctor<T>): T {
    const g = this._globals;
    if (!g) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        "Global registry not available on context (did Xerus attach it?)",
      );
    }

    const byCtor = g.get(Type);
    if (byCtor) return byCtor as T;

    const name = (Type as any)?.name;
    if (name) {
      const byName = g.get(name);
      if (byName) return byName as T;
    }

    throw new SystemErr(
      SystemErrCode.INTERNAL_SERVER_ERR,
      `Global injectable not registered: ${Type?.name ?? "UnknownType"}`,
    );
  }

  ensureConfigurable() {
    if (this.__timeoutSent) return;
    if (this._state === ContextState.SENT) return;
    if (this._state === ContextState.STREAMING) {
      throw new SystemErr(
        SystemErrCode.HEADERS_ALREADY_SENT,
        "Cannot modify headers or status after response has started streaming.",
      );
    }
  }

  ensureBodyModifiable() {
    if (this.__timeoutSent) return;
    this.ensureConfigurable();
    if (this._state === ContextState.SENT) return;
    if (this._state === ContextState.WRITTEN) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        "Double Response: Attempted to write body after response was finalized (e.g. after redirect).",
      );
    }
  }
}
// --- END FILE: src/HTTPContext.ts ---
