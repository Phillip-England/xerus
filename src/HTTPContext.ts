import { MutResponse } from "./MutResponse";
import { ContextState } from "./ContextState";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { RequestCookies, ResponseCookies } from "./Cookies";
import { RequestHeaders } from "./Headers";
import { createDataBag, type DataBag } from "./DataBag";
import type { WSContext } from "./WSContext";

export type ParsedBodyMode = "NONE" | "TEXT" | "JSON" | "FORM" | "MULTIPART";

export class HTTPContext {
  // Public State
  req!: Request;
  res: MutResponse;
  data: DataBag;
  
  // Routing State
  path: string = "/";
  method: string = "GET";
  route: string = "";
  params: Record<string, string> = {};
  
  // Internal/System State (Public for Utils, but prefixed)
  _url: URL | null = null;
  _segments: string[] | null = null;
  _reqHeaders: RequestHeaders | null = null;
  _reqCookiesView: RequestCookies | null = null;
  _resCookiesWriter: ResponseCookies | null = null;
  
  // Body State
  _body?: unknown;
  _rawBody: string | null = null;
  _parsedBodyMode: ParsedBodyMode = "NONE";

  // Websocket State
  _wsMessage: string | Buffer | null = null;
  _wsContext: WSContext | null = null;
  _isWS: boolean = false;

  // Lifecycle State
  _state: ContextState = ContextState.OPEN;
  _store: Map<string, any> = new Map();
  _globals: Map<any, any> | null = null;
  
  public err: Error | undefined | string;
  public __timeoutSent?: boolean;
  public __holdRelease?: Promise<void>;

  constructor() {
    this.res = new MutResponse();
    this.data = createDataBag();
  }

  // --- Lifecycle & Pooling (Keep these here) ---

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
    this.res.cookies.resetRequest(req.headers.get("Cookie"));
    this._reqCookiesView = null;
    this._resCookiesWriter = null;
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

  // --- Core Data Accessors ---

  service<T>(Type: new (...args: any[]) => T): T {
    const v = this.data.getCtor(Type);
    if (!v) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        `Service not available on context: ${Type?.name ?? "UnknownType"}`,
      );
    }
    return v as T;
  }

  global<T>(Type: new (...args: any[]) => T): T {
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

  // --- State Guards (Used by Utils) ---

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