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

  // NOTE: This is internal storage for request-scoped resolved instances.
  // Users must access via c.service(Type) only.
  private _services: DataBag;

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

  // Attached by Xerus. Used only by c.global().
  _globals: Map<any, any> | null = null;

  public err: Error | undefined | string;

  public __timeoutSent?: boolean;
  public __holdRelease?: Promise<void>;

  constructor() {
    this.res = new MutResponse();
    this._services = createDataBag();
  }

  /**
   * @internal Framework hook — get a request-scoped instance.
   * Users must NOT use this directly; use c.service(Type).
   */
  _getServiceCtor<T>(Type: Ctor<T>): T | undefined {
    return this._services.getCtor(Type);
  }

  /**
   * @internal Framework hook — set a request-scoped instance.
   */
  _setServiceCtor<T>(Type: Ctor<T>, value: T): void {
    this._services.setCtor(Type, value);
  }

  /**
   * @internal Framework hook — clear request-scoped instances.
   */
  _clearServices(): void {
    this._services.clear();
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

    // Clear request-scoped instances.
    this._clearServices();

    this._isWS = false;

    this.__timeoutSent = undefined;
    this.__holdRelease = undefined;

    const u = new URL(req.url);
    this.path = u.pathname.replace(/\/+$/, "") || "/";
    this.method = this.req.method;
    this.route = `${this.method} ${this.path}`;

    this._reqHeaders = new RequestHeaders(req.headers);

    this.res.cookies.resetRequest(req.headers.get("Cookie"));
    this._reqCookiesView = null;
    this._resCookiesWriter = null;
  }

  /**
   * Clears per-message/request scope state (services + body parsing state).
   * Used for WS messages, or if you want to manually reset scope mid-chain.
   */
  resetScope(): void {
    this._clearServices();
    this._body = undefined;
    this._rawBody = null;
    this._parsedBodyMode = "NONE";
  }

  resetForWSEvent(wsMethod: string): void {
    this.clearResponse();
    this.err = undefined;
    this.__timeoutSent = undefined;
    this.__holdRelease = undefined;

    this.resetScope();

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

  get cookies() {
    if (!this._reqCookiesView) this._reqCookiesView = new RequestCookies(this.res.cookies);
    if (!this._resCookiesWriter) this._resCookiesWriter = new ResponseCookies(this.res.cookies);
    return {
      request: this._reqCookiesView,
      response: this._resCookiesWriter,
    };
  }

  /**
   * Resolve request-scoped injected/validated instances.
   * This is the ONLY supported per-request derivation API for users.
   */
  service<T>(Type: Ctor<T>): T {
    const v = this._getServiceCtor(Type);
    if (!v) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        `Service not available on context: ${Type?.name ?? "UnknownType"}`,
      );
    }
    return v as T;
  }

  /**
   * Resolve globally provided singletons.
   * This is the ONLY supported global derivation API for users.
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
