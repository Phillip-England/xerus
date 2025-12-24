import { MutResponse } from "./MutResponse";
import { ContextState } from "./ContextState";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { RequestCookies, ResponseCookies } from "./Cookies";
import { RequestHeaders } from "./Headers";
import { createDataBag, type DataBag } from "./DataBag";
import type { WSContext } from "./WSContext";
import type { TypeValidator } from "./TypeValidator";

export type ParsedBodyMode = "NONE" | "TEXT" | "JSON" | "FORM" | "MULTIPART";

type Ctor<T> = new (...args: any[]) => T;

type AnyValidatorCtor = new () => TypeValidator<any>;
type ValidatedOut<TCtor extends AnyValidatorCtor> = Awaited<
  ReturnType<InstanceType<TCtor>["validate"]>
>;

export class HTTPContext {
  req!: Request;
  res: MutResponse;

  private _services: DataBag;
  private _validated: DataBag;

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
  _globals: Map<any, any> | null = null;

  public err: Error | undefined | string;
  public __timeoutSent?: boolean;
  public __holdRelease?: Promise<void>;

  constructor() {
    this.res = new MutResponse();
    this._services = createDataBag();
    this._validated = createDataBag();
  }

  _getServiceCtor<T>(Type: Ctor<T>): T | undefined {
    return this._services.getCtor(Type);
  }
  _setServiceCtor<T>(Type: Ctor<T>, value: T): void {
    this._services.setCtor(Type, value);
  }
  _hasServiceCtor(Type: Ctor<any>): boolean {
    return this._services.hasCtor(Type);
  }
  _clearServices(): void {
    this._services.clear();
  }

  _getValidatedCtor<T>(Type: Ctor<T>): T | undefined {
    return this._validated.getCtor(Type);
  }
  _setValidatedCtor<T>(Type: Ctor<T>, value: T): void {
    this._validated.setCtor(Type, value);
  }
  _hasValidatedCtor(Type: Ctor<any>): boolean {
    return this._validated.hasCtor(Type);
  }
  _clearValidated(): void {
    this._validated.clear();
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

    this._clearServices();
    this._clearValidated();

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

  resetScope(): void {
    this._clearServices();
    this._clearValidated();
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

  service<T>(Type: Ctor<T>): T {
    if (!this._hasServiceCtor(Type)) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        `Service not available on context: ${Type?.name ?? "UnknownType"}`,
      );
    }
    return this._getServiceCtor(Type) as T;
  }

  /**
   * Returns ONLY the value returned by the validator's validate() method.
   * If you want access to raw input, you must include/return it from validate().
   */
  validated<TCtor extends AnyValidatorCtor>(Type: TCtor): ValidatedOut<TCtor> {
    if (!this._hasValidatedCtor(Type as any)) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        `Validated value not available: ${(Type as any)?.name ?? "UnknownType"} (did you declare it in validators = [...]?)`,
      );
    }
    return this._getValidatedCtor(Type as any) as ValidatedOut<TCtor>;
  }

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
