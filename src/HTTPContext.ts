// PATH: /home/jacex/src/xerus/src/HTTPContext.ts

import { MutResponse } from "./MutResponse";
import { BodyType } from "./BodyType";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { ContextState } from "./ContextState";
import type { CookieOptions } from "./CookieOptions";
import { ValidatedData } from "./ValidatedData";

// Helper type for Class Constructors
export type Constructable<T> = new (...args: any[]) => T;

type ParsedBodyMode = "NONE" | "TEXT" | "JSON" | "FORM" | "MULTIPART";

export class HTTPContext {
  // @ts-ignore: Initialized in reset()
  req: Request;
  res: MutResponse;

  private _url: URL | null = null;
  path: string = "/";
  method: string = "GET";
  route: string = "";

  // Lazy Segment Store
  private _segments: string[] | null = null;

  params: Record<string, string> = {};

  private _body?: string | Record<string, any> | FormData;
  private _rawBody: string | null = null;

  // Tracks how the body has been consumed/parsed to prevent unsafe re-parses
  private _parsedBodyMode: ParsedBodyMode = "NONE";

  public _wsMessage: string | Buffer | null = null;

  // General Data Store (User middleware data)
  data: Record<string, any> = {};

  // ✅ Validated Data Store (separate object, passed into handlers)
  validated: ValidatedData;

  private err: Error | undefined | string;

  private _state: ContextState = ContextState.OPEN;

  // Used by Xerus WS pooling
  public _isWS: boolean = false;

  constructor() {
    this.res = new MutResponse();
    this.validated = new ValidatedData();
  }

  reset(req: Request, params: Record<string, string> = {}) {
    this.req = req;
    this.res.reset();

    this._state = ContextState.OPEN;
    this._url = null;
    this._segments = null;

    this._body = undefined;
    this._rawBody = null;
    this._parsedBodyMode = "NONE";

    this.err = undefined;
    this._wsMessage = null;

    this.data = {};
    this.validated.clear();

    this._isWS = false;

    const urlIndex = req.url.indexOf("/", 8);
    const queryIndex = req.url.indexOf("?", urlIndex);

    const pathStr =
      queryIndex === -1 ? req.url.substring(urlIndex) : req.url.substring(urlIndex, queryIndex);

    this.path = pathStr.replace(/\/+$/, "") || "/";
    this.method = this.req.method;
    this.route = `${this.method} ${this.path}`;

    this.params = params;
  }

  clearResponse() {
    this.res.reset();
    this._state = ContextState.OPEN;
  }

  get url(): URL {
    if (!this._url) this._url = new URL(this.req.url);
    return this._url;
  }

  get segments(): string[] {
    if (!this._segments) this._segments = this.path.split("/").filter(Boolean);
    return this._segments;
  }

  // -------------------------

  get isDone(): boolean {
    return this._state !== ContextState.OPEN;
  }

  private get _timedOut(): boolean {
    return !!this.data?.__timeoutSent;
  }

  private ensureConfigurable() {
    // ✅ After timeout, make all future writes a NO-OP (do not throw)
    if (this._timedOut) return;

    if (this._state === ContextState.STREAMING || this._state === ContextState.SENT) {
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

  getResHeader(name: string): string | null {
    return this.res.getHeader(name) || null;
  }

  private ensureBodyModifiable() {
    // ✅ After timeout, make all future writes a NO-OP (do not throw)
    if (this._timedOut) return;

    this.ensureConfigurable();
    if (this._state === ContextState.WRITTEN) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        "Double Response: Attempted to write body after response was finalized (e.g. after redirect).",
      );
    }
  }

  // -------------------------
  // Unified error envelope helper
  // -------------------------

  /**
   * Standard JSON error response shape for the framework.
   * This is what SystemErrRecord uses.
   */
  errorJSON(
    status: number,
    code: string,
    message: string,
    extra?: Record<string, any>,
  ): void {
    if (this._timedOut) return;
    this.ensureBodyModifiable();
    this.setStatus(status).json({
      error: {
        code,
        message,
        ...(extra ?? {}),
      },
    });
  }

  // -------------------------
  // Ergonomic error helpers
  // -------------------------

  badRequest(detail = "Bad Request", code = "BAD_REQUEST", extra?: Record<string, any>) {
    if (this._timedOut) return;
    this.errorJSON(400, code, "Bad Request", { detail, ...(extra ?? {}) });
  }

  unauthorized(detail = "Unauthorized", code = "UNAUTHORIZED", extra?: Record<string, any>) {
    if (this._timedOut) return;
    this.errorJSON(401, code, "Unauthorized", { detail, ...(extra ?? {}) });
  }

  forbidden(detail = "Forbidden", code = "FORBIDDEN", extra?: Record<string, any>) {
    if (this._timedOut) return;
    this.errorJSON(403, code, "Forbidden", { detail, ...(extra ?? {}) });
  }

  notFound(detail = "Not Found", code = "NOT_FOUND", extra?: Record<string, any>) {
    if (this._timedOut) return;
    this.errorJSON(404, code, "Not Found", { detail, ...(extra ?? {}) });
  }

  conflict(detail = "Conflict", code = "CONFLICT", extra?: Record<string, any>) {
    if (this._timedOut) return;
    this.errorJSON(409, code, "Conflict", { detail, ...(extra ?? {}) });
  }

  tooManyRequests(detail = "Too Many Requests", code = "RATE_LIMITED", extra?: Record<string, any>) {
    if (this._timedOut) return;
    this.errorJSON(429, code, "Too Many Requests", { detail, ...(extra ?? {}) });
  }

  internalError(detail = "Internal Server Error", code = "INTERNAL_ERROR", extra?: Record<string, any>) {
    if (this._timedOut) return;
    this.errorJSON(500, code, "Internal Server Error", { detail, ...(extra ?? {}) });
  }

  serviceUnavailable(detail = "Service Unavailable", code = "SERVICE_UNAVAILABLE", extra?: Record<string, any>) {
    if (this._timedOut) return;
    this.errorJSON(503, code, "Service Unavailable", { detail, ...(extra ?? {}) });
  }

  gatewayTimeout(detail = "Gateway Timeout", code = "TIMEOUT", extra?: Record<string, any>) {
    if (this._timedOut) return;
    this.errorJSON(504, code, "Gateway Timeout", { detail, ...(extra ?? {}) });
  }

  // -------------------------
  // Request identity helpers
  // -------------------------

  /**
   * Best-effort client IP for rate limiting / auditing.
   */
  getClientIP(): string {
    const xff = this.getHeader("x-forwarded-for") || this.getHeader("X-Forwarded-For");
    if (xff) return xff.split(",")[0].trim();
    const xrip = this.getHeader("x-real-ip") || this.getHeader("X-Real-IP");
    if (xrip) return xrip.trim();
    return "unknown";
  }

  /**
   * Request ID (middleware sets this; you can still read it).
   */
  getRequestId(): string {
    return (this.data?.requestId as string) || "";
  }

  // -------------------------
  // Redirect
  // -------------------------

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
        params.append(key, String(value));
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
    this.res.setHeader("Location", finalLocation);
    this.finalize();
  }

  // -------------------------
  // Body parsing w/ consumption rules
  // -------------------------

  private assertReparseAllowed(nextMode: ParsedBodyMode) {
    // ✅ Always block JSON <-> FORM re-parsing (tests expect this),
    // even if we still have raw text available.
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
    if (nextMode === "MULTIPART" && this._parsedBodyMode !== "NONE" && this._parsedBodyMode !== "MULTIPART") {
      throw new SystemErr(
        SystemErrCode.BODY_PARSING_FAILED,
        "Body already consumed as TEXT/JSON/FORM; it cannot be re-parsed as MULTIPART.",
      );
    }
  }

  async parseBody<T extends BodyType>(expectedType: T): Promise<any> {
    if (expectedType === BodyType.JSON && this._body !== undefined && this._parsedBodyMode === "JSON") return this._body;

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
        const obj = Object.fromEntries(new URLSearchParams(this._rawBody));
        this._body = obj;
        this._parsedBodyMode = "FORM";
        return obj;
      }

      if (expectedType === BodyType.TEXT) {
        this._parsedBodyMode = this._parsedBodyMode === "NONE" ? "TEXT" : this._parsedBodyMode;
        return this._rawBody;
      }
    }

    const contentType = this.req.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      if (expectedType !== BodyType.JSON && expectedType !== BodyType.TEXT) {
        throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected JSON data");
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      if (expectedType !== BodyType.FORM && expectedType !== BodyType.TEXT) {
        throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected FORM data");
      }
    } else if (contentType.includes("multipart/form-data")) {
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
      expectedType === BodyType.TEXT
        ? "TEXT"
        : expectedType === BodyType.JSON
          ? "JSON"
          : expectedType === BodyType.FORM
            ? "FORM"
            : "TEXT",
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
      const obj = Object.fromEntries(new URLSearchParams(text));
      this._body = obj;
      this._parsedBodyMode = "FORM";
      return obj;
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

  setHeader(name: string, value: string): this {
    if (this._timedOut) return this;
    this.ensureConfigurable();
    if (/[\r\n]/.test(value)) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        `Attempted to set invalid header "${name}". Values cannot contain newlines.`,
      );
    }
    this.res.setHeader(name, value);
    return this;
  }

  getHeader(name: string): string | null {
    return this.req.headers.get(name);
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
    if (!this.res.getHeader("Content-Type")) this.setHeader("Content-Type", "text/plain");
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
    this.res.setHeader("Content-Type", file.type || "application/octet-stream");
    this.res.body(file);
    this.finalize();
  }

  setStore(key: string, value: any): void {
    this.data[key] = value;
  }

  getStore(key: string): any {
    return this.data[key];
  }

  getCookie(name: string): string | undefined {
    const cookies = this.req.headers.get("Cookie");
    if (!cookies) return undefined;
    return cookies
      .split("; ")
      .map((c) => c.split(/=(.*)/s, 2))
      .reduce<Record<string, string>>((acc, [key, val]) => {
        acc[key] = val;
        return acc;
      }, {})[name];
  }

  setCookie(name: string, value: string, options: CookieOptions = {}) {
    if (this._timedOut) return;
    this.ensureConfigurable();

    let cookieString = `${name}=${encodeURIComponent(value)}`;

    options.path ??= "/";
    options.httpOnly ??= true;
    options.sameSite ??= "Lax";

    if (options.secure === undefined) {
      options.secure = this.url.protocol === "https:";
    }

    if (options.path) cookieString += `; Path=${options.path}`;
    if (options.domain) cookieString += `; Domain=${options.domain}`;
    if (options.maxAge !== undefined) cookieString += `; Max-Age=${options.maxAge}`;
    if (options.expires) cookieString += `; Expires=${options.expires.toUTCString()}`;
    if (options.httpOnly) cookieString += `; HttpOnly`;
    if (options.secure) cookieString += `; Secure`;
    if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;

    this.setHeader("Set-Cookie", cookieString);
  }

  clearCookie(name: string, path: string = "/", domain?: string): void {
    if (this._timedOut) return;
    this.setCookie(name, "", { path, domain, maxAge: 0, expires: new Date(0) });
  }
}
