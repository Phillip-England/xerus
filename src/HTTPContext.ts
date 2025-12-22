// src/HTTPContext.ts
import { MutResponse } from "./MutResponse";
import { BodyType } from "./BodyType";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { ContextState } from "./ContextState";
import type { CookieOptions } from "./CookieOptions";
import type { WSContext } from "./WSContext";
import { HeaderRef, RequestHeaders } from "./Headers";
import type { CookieRef } from "./Cookies";

type ParsedBodyMode = "NONE" | "TEXT" | "JSON" | "FORM" | "MULTIPART";

export type ParsedFormBodyLast = Record<string, string>;
export type ParsedFormBodyMulti = Record<string, string | string[]>;

export type ParseBodyOptions = {
  strict?: boolean;
  formMode?: "last" | "multi" | "params";
};

export class HTTPContext {
  req!: Request;
  res: MutResponse;

  private _url: URL | null = null;
  path: string = "/";
  method: string = "GET";
  route: string = "";
  private _segments: string[] | null = null;
  params: Record<string, string> = {};

  private _body?: unknown;
  private _rawBody: string | null = null;
  private _parsedBodyMode: ParsedBodyMode = "NONE";

  public _wsMessage: string | Buffer | null = null;
  public _wsContext: WSContext | null = null;

  data: Record<string, any> = {};
  store: Record<string, any> = {};

  private err: Error | undefined | string;
  private _state: ContextState = ContextState.OPEN;
  public _isWS: boolean = false;

  private _reqHeaders: RequestHeaders | null = null;

  constructor() {
    this.res = new MutResponse();
  }

  private cleanObj(obj: Record<string, any>) {
    for (const key in obj) delete obj[key];
  }

  isWsRoute(): boolean {
    return this._wsContext != null;
  }

  ws(): WSContext {
    if (!this._wsContext) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        "WebSocket context is not available. Are you calling c.ws() from a non-WS route/middleware?",
      );
    }
    return this._wsContext;
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

    this.cleanObj(this.data);
    this.cleanObj(this.store);

    this._isWS = false;

    const urlIndex = req.url.indexOf("/", 8);
    const queryIndex = req.url.indexOf("?", urlIndex);
    const pathStr = queryIndex === -1
      ? req.url.substring(urlIndex)
      : req.url.substring(urlIndex, queryIndex);

    this.path = pathStr.replace(/\/+$/, "") || "/";
    this.method = this.req.method;
    this.route = `${this.method} ${this.path}`;

    this._reqHeaders = new RequestHeaders(req.headers);
    this.res.cookies.resetRequest(req.headers.get("Cookie"));
  }

  clearResponse() {
    this.res.reset();
    this._state = ContextState.OPEN;
  }

  markSent() {
    this._state = ContextState.SENT;
  }

  get url(): URL {
    if (!this._url) this._url = new URL(this.req.url);
    return this._url;
  }

  get segments(): string[] {
    if (!this._segments) this._segments = this.path.split("/").filter(Boolean);
    return this._segments;
  }

  get isDone(): boolean {
    return this._state !== ContextState.OPEN;
  }

  private get _timedOut(): boolean {
    return !!(this.data as any).__timeoutSent;
  }

  private ensureConfigurable() {
    if (this._timedOut) return;
    if (this._state === ContextState.SENT) return;
    if (this._state === ContextState.STREAMING) {
      throw new SystemErr(
        SystemErrCode.HEADERS_ALREADY_SENT,
        "Cannot modify headers or status after response has started streaming.",
      );
    }
  }

  finalize() {
    if (this._state === ContextState.OPEN) this._state = ContextState.WRITTEN;
  }

  setErr(err: Error | undefined | string) {
    this.err = err;
  }

  getErr(): Error | undefined | string {
    return this.err;
  }

  getResHeader(name: string): HeaderRef {
    return new HeaderRef(this.res.headers, name);
  }

  private ensureBodyModifiable() {
    if (this._timedOut) return;
    this.ensureConfigurable();
    if (this._state === ContextState.SENT) return;
    if (this._state === ContextState.WRITTEN) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        "Double Response: Attempted to write body after response was finalized (e.g. after redirect).",
      );
    }
  }

  errorJSON(
    status: number,
    code: string,
    message: string,
    extra?: Record<string, any>,
  ): void {
    if (this._timedOut) return;
    this.ensureBodyModifiable();
    this.setStatus(status).json({
      error: { code, message, ...(extra ?? {}) },
    });
  }

  getClientIP(): string {
    const xff =
      this.getHeader("x-forwarded-for").get() ||
      this.getHeader("X-Forwarded-For").get();
    if (xff) return xff.split(",")[0].trim();

    const xrip =
      this.getHeader("x-real-ip").get() ||
      this.getHeader("X-Real-IP").get();
    if (xrip) return xrip.trim();

    return "unknown";
  }

  getRequestId(): string {
    return (this.data as any).requestId || "";
  }

  redirect(path: string, status?: number): void;
  redirect(path: string, query: Record<string, any>, status?: number): void;
  redirect(path: string, arg2?: number | Record<string, any>, arg3?: number): void {
    if (this._timedOut) return;
    this.ensureConfigurable();
    let status = 302;
    let finalLocation = path;

    if (typeof arg2 === "number") {
      status = arg2;
    } else if (arg2 && typeof arg2 === "object") {
      if (typeof arg3 === "number") status = arg3;
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(arg2)) {
        if (value === undefined || value === null) continue;
        const t = typeof value;
        if (t === "string" || t === "number" || t === "boolean") {
          params.append(key, String(value));
          continue;
        }
        throw new SystemErr(
          SystemErrCode.INTERNAL_SERVER_ERR,
          `Redirect query param "${key}" must be string/number/boolean (got ${t}).`,
        );
      }
      const queryString = params.toString();
      if (queryString.length > 0) {
        const separator = finalLocation.includes("?") ? "&" : "?";
        finalLocation += separator + queryString;
      }
    }

    if (/[\r\n]/.test(finalLocation)) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        "Redirect location contains invalid characters (newlines). Did you forget encodeURIComponent()?",
      );
    }

    this.res.setStatus(status);
    this.res.headers.set("Location", finalLocation);
    this.finalize();
  }

  private assertReparseAllowed(nextMode: ParsedBodyMode) {
    if (this._parsedBodyMode === "JSON" && nextMode === "FORM") {
      throw new SystemErr(
        SystemErrCode.BODY_PARSING_FAILED,
        "Body already parsed as JSON; re-parsing as FORM is not allowed.",
      );
    }
    if (this._parsedBodyMode === "FORM" && nextMode === "JSON") {
      throw new SystemErr(
        SystemErrCode.BODY_PARSING_FAILED,
        "Body already parsed as FORM; re-parsing as JSON is not allowed.",
      );
    }
    if (this._parsedBodyMode === "MULTIPART" && nextMode !== "MULTIPART") {
      throw new SystemErr(
        SystemErrCode.BODY_PARSING_FAILED,
        "Body already consumed as MULTIPART; it cannot be re-parsed.",
      );
    }
    if (
      nextMode === "MULTIPART" &&
      this._parsedBodyMode !== "NONE" &&
      this._parsedBodyMode !== "MULTIPART"
    ) {
      throw new SystemErr(
        SystemErrCode.BODY_PARSING_FAILED,
        "Body already consumed as TEXT/JSON/FORM; it cannot be re-parsed as MULTIPART.",
      );
    }
  }

  private contentType(): string {
    return (this.req.headers.get("Content-Type") || "").toLowerCase();
  }

  private enforceKnownTypeMismatch(expectedType: BodyType) {
    if (expectedType === BodyType.TEXT) return;
    const ct = this.contentType();
    const isJson = ct.includes("application/json");
    const isForm = ct.includes("application/x-www-form-urlencoded");
    const isMultipart = ct.includes("multipart/form-data");

    if (isJson && expectedType !== BodyType.JSON) {
      throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected JSON data");
    }
    if (isForm && expectedType !== BodyType.FORM) {
      throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected FORM data");
    }
    if (isMultipart && expectedType !== BodyType.MULTIPART_FORM) {
      throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected MULTIPART_FORM data");
    }
  }

  private enforceStrictContentType(expectedType: BodyType, strict: boolean) {
    if (!strict) return;
    if (expectedType === BodyType.TEXT) return;

    const ct = this.contentType();
    if (expectedType === BodyType.JSON && !ct.includes("application/json")) {
      throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Expected Content-Type application/json");
    }
    if (expectedType === BodyType.FORM && !ct.includes("application/x-www-form-urlencoded")) {
      throw new SystemErr(
        SystemErrCode.BODY_PARSING_FAILED,
        "Expected Content-Type application/x-www-form-urlencoded",
      );
    }
    if (expectedType === BodyType.MULTIPART_FORM && !ct.includes("multipart/form-data")) {
      throw new SystemErr(
        SystemErrCode.BODY_PARSING_FAILED,
        "Expected Content-Type multipart/form-data",
      );
    }
  }

  private parseFormLast(text: string): ParsedFormBodyLast {
    return Object.fromEntries(new URLSearchParams(text)) as ParsedFormBodyLast;
  }

  private parseFormMulti(text: string): ParsedFormBodyMulti {
    const params = new URLSearchParams(text);
    const out: ParsedFormBodyMulti = {};
    for (const [k, v] of params.entries()) {
      const cur = out[k];
      if (cur === undefined) out[k] = v;
      else if (Array.isArray(cur)) cur.push(v);
      else out[k] = [cur, v];
    }
    return out;
  }

  async parseBody(expectedType: BodyType.TEXT, opts?: ParseBodyOptions): Promise<string>;
  async parseBody(expectedType: BodyType.MULTIPART_FORM, opts?: ParseBodyOptions): Promise<FormData>;
  async parseBody(
    expectedType: BodyType.FORM,
    opts?: ParseBodyOptions & { formMode?: "last" | undefined },
  ): Promise<ParsedFormBodyLast>;
  async parseBody(expectedType: BodyType.FORM, opts: ParseBodyOptions & { formMode: "multi" }): Promise<ParsedFormBodyMulti>;
  async parseBody(expectedType: BodyType.FORM, opts: ParseBodyOptions & { formMode: "params" }): Promise<URLSearchParams>;
  async parseBody<J = any>(expectedType: BodyType.JSON, opts?: ParseBodyOptions): Promise<J>;
  async parseBody(expectedType: BodyType, opts: ParseBodyOptions = {}): Promise<any> {
    const strict = !!opts.strict;
    this.enforceStrictContentType(expectedType, strict);
    this.enforceKnownTypeMismatch(expectedType);

    if (expectedType === BodyType.JSON && this._body !== undefined && this._parsedBodyMode === "JSON") {
      return this._body;
    }

    if (
      expectedType === BodyType.TEXT &&
      this._rawBody !== null &&
      (this._parsedBodyMode === "TEXT" || this._parsedBodyMode === "JSON" || this._parsedBodyMode === "FORM")
    ) {
      return this._rawBody;
    }

    if (this._rawBody !== null) {
      if (expectedType === BodyType.JSON) {
        this.assertReparseAllowed("JSON");
        try {
          const parsed = JSON.parse(this._rawBody);
          this._body = parsed;
          this._parsedBodyMode = "JSON";
          return parsed;
        } catch (err: any) {
          throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, `JSON parsing failed: ${err.message}`);
        }
      }

      if (expectedType === BodyType.FORM) {
        this.assertReparseAllowed("FORM");
        const mode = opts.formMode ?? "last";
        const params = new URLSearchParams(this._rawBody);
        if (mode === "params") return params;
        const parsed = mode === "multi" ? this.parseFormMulti(this._rawBody) : this.parseFormLast(this._rawBody);
        this._body = parsed;
        this._parsedBodyMode = "FORM";
        return parsed;
      }

      if (expectedType === BodyType.TEXT) {
        this._parsedBodyMode = this._parsedBodyMode === "NONE" ? "TEXT" : this._parsedBodyMode;
        return this._rawBody;
      }
    }

    const ct = this.contentType();
    if (ct.includes("multipart/form-data")) {
      if (expectedType !== BodyType.MULTIPART_FORM) {
        throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected MULTIPART_FORM data");
      }
      this.assertReparseAllowed("MULTIPART");
      const fd = await this.req.formData();
      this._body = fd;
      this._parsedBodyMode = "MULTIPART";
      return fd;
    }

    this.assertReparseAllowed(
      expectedType === BodyType.TEXT ? "TEXT" :
      expectedType === BodyType.JSON ? "JSON" :
      expectedType === BodyType.FORM ? "FORM" : "TEXT",
    );

    const text = await this.req.text();
    this._rawBody = text;

    if (expectedType === BodyType.TEXT) {
      this._parsedBodyMode = "TEXT";
      return text;
    }

    if (expectedType === BodyType.JSON) {
      try {
        const parsed = JSON.parse(text);
        this._body = parsed;
        this._parsedBodyMode = "JSON";
        return parsed;
      } catch (err: any) {
        throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, `JSON parsing failed: ${err.message}`);
      }
    }

    if (expectedType === BodyType.FORM) {
      const mode = opts.formMode ?? "last";
      const params = new URLSearchParams(text);
      if (mode === "params") return params;
      const parsed = mode === "multi" ? this.parseFormMulti(text) : this.parseFormLast(text);
      this._body = parsed;
      this._parsedBodyMode = "FORM";
      return parsed;
    }

    this._parsedBodyMode = "TEXT";
    return text;
  }

  getParam(name: string, defaultValue: string = ""): string {
    return this.params[name] || defaultValue;
  }

  query(key: string, defaultValue: string = ""): string {
    return this.url.searchParams.get(key) || defaultValue;
  }

  get queries(): Record<string, string> {
    return Object.fromEntries(this.url.searchParams);
  }

  setStatus(code: number): this {
    if (this._timedOut) return this;
    this.ensureConfigurable();
    this.res.setStatus(code);
    return this;
  }

  /**
   * ✅ returns HeaderRef (response)
   */
  setHeader(name: string, value: string): HeaderRef {
    if (this._timedOut) return new HeaderRef(this.res.headers, name);
    this.ensureConfigurable();

    if (/[\r\n]/.test(value)) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        `Attempted to set invalid header "${name}".`,
      );
    }

    this.res.headers.set(name, value);
    return new HeaderRef(this.res.headers, name);
  }

  /**
   * ✅ returns HeaderRef (request)
   */
  getHeader(name: string): HeaderRef {
    const view = this._reqHeaders ?? new RequestHeaders(this.req.headers);
    return new HeaderRef(view, name);
  }

  /**
   * ✅ returns HeaderRef (response)
   */
  appendHeader(name: string, value: string): HeaderRef {
    if (this._timedOut) return new HeaderRef(this.res.headers, name);
    this.ensureConfigurable();

    if (/[\r\n]/.test(value)) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        `Attempted to set invalid header "${name}".`,
      );
    }

    this.res.headers.append(name, value);
    return new HeaderRef(this.res.headers, name);
  }

  html(content: string): void {
    if (this._timedOut) return;
    this.ensureBodyModifiable();
    this.setHeader("Content-Type", "text/html");
    this.res.body(content);
    this.finalize();
  }

  text(content: string): void {
    if (this._timedOut) return;
    this.ensureBodyModifiable();
    if (!this.res.headers.get("Content-Type")) {
      this.setHeader("Content-Type", "text/plain");
    }
    this.res.body(content);
    this.finalize();
  }

  json(data: any): void {
    if (this._timedOut) return;
    this.ensureBodyModifiable();
    this.setHeader("Content-Type", "application/json");
    this.res.body(JSON.stringify(data));
    this.finalize();
  }

  stream(stream: ReadableStream): void {
    if (this._timedOut) return;
    this.ensureConfigurable();
    this.setHeader("Content-Type", "application/octet-stream");
    this.res.body(stream);
    this._state = ContextState.STREAMING;
  }

  async file(path: string): Promise<void> {
    if (this._timedOut) return;
    this.ensureBodyModifiable();
    this.ensureConfigurable();

    const file = Bun.file(path);
    if (!(await file.exists())) {
      throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, `file does not exist at ${path}`);
    }

    this.res.headers.set("Content-Type", file.type || "application/octet-stream");
    this.res.body(file);
    this.finalize();
  }

  setStore(key: string, value: any): void {
    this.store[key] = value;
  }

  getStore<TVal = any>(key: string): TVal {
    return this.store[key] as TVal;
  }

  /**
   * ✅ returns CookieRef (request read)
   */
  getCookie(name: string): CookieRef {
    return this.res.cookies.ref(name);
  }

  /**
   * ✅ returns CookieRef (response write)
   */
  setCookie(name: string, value: string, options: CookieOptions = {}): CookieRef {
    if (this._timedOut) return this.res.cookies.ref(name);
    this.ensureConfigurable();

    options.path ??= "/";
    options.httpOnly ??= true;
    options.sameSite ??= "Lax";
    if (options.secure === undefined) {
      options.secure = this.url.protocol === "https:";
    }

    this.res.cookies.set(name, value, options);
    return this.res.cookies.ref(name);
  }

  /**
   * ✅ returns CookieRef
   */
  clearCookie(name: string, path: string = "/", domain?: string): CookieRef {
    if (this._timedOut) return this.res.cookies.ref(name);
    this.ensureConfigurable();
    this.res.cookies.clear(name, { path, domain });
    return this.res.cookies.ref(name);
  }

  get headers() {
    // response headers helper (set/append/get)
    return this.res.headers;
  }

  get cookies() {
    // response cookie helper (set/clear) + request get
    return this.res.cookies;
  }
}
