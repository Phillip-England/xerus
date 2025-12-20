import { MutResponse } from "./MutResponse";
import { BodyType } from "./BodyType";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { ContextState } from "./ContextState";
import type { CookieOptions } from "./CookieOptions";

// Helper type for Class Constructors
export type Constructable<T> = new (...args: any[]) => T;

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

  public _wsMessage: string | Buffer | null = null;
  
  // General Data Store (User middleware data)
  data: Record<string, any> = {};

  // Validated Data Store
  // We now support both Class constructors AND string keys (json, query, form)
  private _validatorStore = new Map<Function | string, any>();

  private err: Error | undefined | string;
    
  private _state: ContextState = ContextState.OPEN;
  private _rawBody: string | null = null;

  constructor() {
    this.res = new MutResponse();
  }

  reset(req: Request, params: Record<string, string> = {}) {
    this.req = req;
    this.res.reset(); 

    this._state = ContextState.OPEN;
    this._url = null;
    this._body = undefined;
    this._rawBody = null; 
    this.err = undefined;
    this._wsMessage = null; 
    
    this.data = {}; 
    this._validatorStore.clear();

    const urlIndex = req.url.indexOf("/", 8);
    const queryIndex = req.url.indexOf("?", urlIndex);
    
    const pathStr = queryIndex === -1 
        ? req.url.substring(urlIndex) 
        : req.url.substring(urlIndex, queryIndex);
        
    this.path = pathStr.replace(/\/+$/, "") || "/";
    this.method = this.req.method;
    this.route = `${this.method} ${this.path}`;
    
    this._segments = null;
    this.params = params;
  }

  clearResponse() {
    this.res.reset();
    this._state = ContextState.OPEN;
  }

  get url(): URL {
    if (!this._url) {
      this._url = new URL(this.req.url);
    }
    return this._url;
  }

  get segments(): string[] {
    if (!this._segments) {
        this._segments = this.path.split("/").filter(Boolean);
    }
    return this._segments;
  }

  // --- Validation Storage ---

  /**
   * Store validated data.
   * @param key A Class Constructor OR a string key (e.g., "json", "query")
   * @param instance The validated data
   */
  setValid<T>(key: Constructable<T> | string, instance: T): void {
    this._validatorStore.set(key, instance);
  }

  /**
   * Retrieve validated data.
   * @param key A Class Constructor OR a string key (e.g., "json", "query")
   */
  getValid<T>(key: Constructable<T> | string): T {
    const validData = this._validatorStore.get(key);
    // If not found, return empty object (safe default) or undefined
    // For string keys, usually implies optional if missing, but let's be safe.
    return (validData || {}) as T;
  }

  // --- Legacy / Helper Accessors for standard Route validation ---
  
  get validJSON(): any { return this.getValid("json"); }
  get validForm(): any { return this.getValid("form"); }
  get validQuery(): any { return this.getValid("query"); }
  get validParams(): any { return this.getValid("param"); }

  // -------------------------

  get isDone(): boolean {
    return this._state !== ContextState.OPEN;
  }

  private ensureConfigurable() {
    if (this._state === ContextState.STREAMING || this._state === ContextState.SENT) {
      throw new SystemErr(
        SystemErrCode.HEADERS_ALREADY_SENT, 
        "Cannot modify headers or status after response has started streaming."
      );
    }
  }

  finalize() {
    if (this._state === ContextState.OPEN) {
      this._state = ContextState.WRITTEN;
    }
  }

  setErr(err: Error | undefined | string) {
    this.err = err;
  }

  getErr(): Error | undefined | string {
    return this.err;
  }

  getResHeader(name: string): string | null {
    return this.res.getHeader(name);
  }

  private ensureBodyModifiable() {
    this.ensureConfigurable(); 
    if (this._state === ContextState.WRITTEN) {
       throw new SystemErr(
         SystemErrCode.INTERNAL_SERVER_ERR, 
         "Double Response: Attempted to write body after response was finalized (e.g. after redirect)."
       );
    }
  }

  redirect(path: string, status?: number): void;
  redirect(path: string, query: Record<string, any>, status?: number): void;
  redirect(path: string, arg2?: number | Record<string, any>, arg3?: number): void {
    this.ensureConfigurable();

    let status = 302;
    let finalLocation = path;

    if (typeof arg2 === "number") {
      status = arg2;
    } else if (arg2 && typeof arg2 === "object") {
      if (typeof arg3 === "number") {
        status = arg3;
      }
      
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
         "Redirect location contains invalid characters (newlines). Did you forget encodeURIComponent()?"
       );
    }

    this.res.setStatus(status);
    this.res.setHeader("Location", finalLocation);
    this.finalize(); 
  }

  async parseBody<T extends BodyType>(expectedType: T): Promise<any> {
    if (this._body !== undefined && expectedType === BodyType.JSON) {
      return this._body;
    }
    if (this._rawBody !== null && expectedType === BodyType.TEXT) {
      return this._rawBody;
    }

    if (this._rawBody !== null) {
      if (expectedType === BodyType.JSON) {
        try {
          const parsed = JSON.parse(this._rawBody);
          this._body = parsed;
          return parsed;
        } catch (err: any) {
          throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, `JSON parsing failed: ${err.message}`);
        }
      }
      if (expectedType === BodyType.FORM) {
        return Object.fromEntries(new URLSearchParams(this._rawBody));
      }
    }

    const contentType = this.req.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
       if (expectedType !== BodyType.JSON && expectedType !== BodyType.TEXT) {
           throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected JSON data");
       }
    }
    else if (contentType.includes("application/x-www-form-urlencoded")) {
       if (expectedType !== BodyType.FORM && expectedType !== BodyType.TEXT) {
           throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected FORM data");
       }
    }
    else if (contentType.includes("multipart/form-data")) {
       if (expectedType !== BodyType.MULTIPART_FORM) {
           throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected MULTIPART_FORM data");
       }
       return await this.req.formData();
    }

    const text = await this.req.text();
    this._rawBody = text;

    if (expectedType === BodyType.TEXT) {
      return text;
    }

    if (expectedType === BodyType.JSON) {
      try {
        const parsed = JSON.parse(text);
        this._body = parsed;
        return parsed;
      } catch (err: any) {
        throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, `JSON parsing failed: ${err.message}`);
      }
    }

    if (expectedType === BodyType.FORM) {
      return Object.fromEntries(new URLSearchParams(text));
    }

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
    this.ensureConfigurable();
    this.res.setStatus(code);
    return this;
  }

  setHeader(name: string, value: string): this {
    this.ensureConfigurable();
    if (/[\r\n]/.test(value)) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        `Attempted to set invalid header "${name}". Values cannot contain newlines.`
      );
    }
    this.res.setHeader(name, value);
    return this;
  }

  getHeader(name: string): string | null {
    return this.req.headers.get(name);
  }

  html(content: string): void {
    this.ensureBodyModifiable(); 
    this.setHeader("Content-Type", "text/html");
    this.res.body(content);
    this.finalize();
  }

  text(content: string): void {
    this.ensureBodyModifiable(); 
    if (!this.res.getHeader("Content-Type")) this.setHeader("Content-Type", "text/plain");
    this.res.body(content);
    this.finalize();
  }

  json(data: any): void {
    this.ensureBodyModifiable(); 
    this.setHeader("Content-Type", "application/json");
    this.res.body(JSON.stringify(data));
    this.finalize();
  }

  stream(stream: ReadableStream): void {
    this.ensureConfigurable();
    this.setHeader("Content-Type", "application/octet-stream");
    this.res.body(stream);
    this._state = ContextState.STREAMING;
  }

  async file(path: string): Promise<void> {
    this.ensureBodyModifiable();
    this.ensureConfigurable();
    let file = Bun.file(path);
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
    return cookies.split("; ")
      .map((c) => c.split(/=(.*)/s, 2))
      .reduce<Record<string, string>>((acc, [key, val]) => {
        acc[key] = val;
        return acc;
      }, {})[name];
  }

  setCookie(name: string, value: string, options: CookieOptions = {}) {
    this.ensureConfigurable();
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    options.path ??= "/";
    options.httpOnly ??= true;
    options.secure ??= true;
    options.sameSite ??= "Lax";
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
    this.setCookie(name, "", { path, domain, maxAge: 0, expires: new Date(0) });
  }
}