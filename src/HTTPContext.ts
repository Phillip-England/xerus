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

  // Staging area for WebSocket messages to allow Validator access
  public _wsMessage: string | Buffer | null = null;
  
  // Generic data store (for strings/legacy middleware)
  data: Record<string, any> = {};
  
  // New Type-Safe Validator Store
  private _validatorStore = new Map<Function, any>();

  private err: Error | undefined | string;
    
  private _state: ContextState = ContextState.OPEN;

  constructor() {
    this.res = new MutResponse();
  }

  reset(req: Request, params: Record<string, string> = {}) {
    this.req = req;
    this.res.reset(); 

    // Reset State
    this._state = ContextState.OPEN;
    this._url = null;
    this._body = undefined;
    this.err = undefined;
    this._wsMessage = null; // Reset WS Message
    
    // Clear Stores
    this.data = {}; 
    this._validatorStore.clear();

    // Optimization: Parse path manually
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

  setValid<T>(type: Constructable<T>, instance: T): void {
    this._validatorStore.set(type, instance);
  }

  getValid<T>(type: Constructable<T>): T {
    const validData = this._validatorStore.get(type);
    if (!validData) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR, 
        `getValid(${type.name}) called but no validation data found.`
      );
    }
    return validData as T;
  }

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

  redirect(location: string, status: number = 302): void {
    this.ensureConfigurable();
    this.res.setStatus(status);
    this.res.setHeader("Location", location);
    this.finalize();
  }

  async parseBody<T extends BodyType>(expectedType: T): Promise<any> {
    if (this._body !== undefined) {
      if (expectedType === BodyType.JSON && typeof this._body === "string") {
        try {
          const parsed = JSON.parse(this._body);
          this._body = parsed; 
          return parsed;
        } catch (err: any) {
          throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, `JSON parsing failed: ${err.message}`);
        }
      }
      return this._body;
    }

    const contentType = this.req.headers.get("Content-Type") || "";
    let parsedData: any;

    if (expectedType === BodyType.TEXT) {
      parsedData = await this.req.text();
    } 
    else if (contentType.includes("application/json")) {
      if (expectedType !== BodyType.JSON) throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected JSON data");
      try { parsedData = await this.req.json(); } 
      catch (err: any) { throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, `JSON parsing failed: ${err.message}`); }
    } 
    else if (contentType.includes("application/x-www-form-urlencoded")) {
      if (expectedType !== BodyType.FORM) throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected FORM data");
      parsedData = Object.fromEntries(new URLSearchParams(await this.req.text()));
    } 
    else if (contentType.includes("multipart/form-data")) {
      if (expectedType !== BodyType.MULTIPART_FORM) throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected MULTIPART_FORM data");
      parsedData = await this.req.formData();
    } 
    else {
      if (expectedType !== BodyType.TEXT) throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected TEXT data");
      parsedData = await this.req.text();
    }

    this._body = parsedData;
    return parsedData;
  }

  getParam(name: string, defaultValue: string = ""): string {
    return this.params[name] || defaultValue;
  }

  query(key: string, defaultValue: string = ""): string {
    return this.url.searchParams.get(key) || defaultValue;
  }

  /**
   * Retrieves all query parameters as a key-value object.
   * Useful for validating query strings.
   */
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
    this.res.setHeader(name, value);
    return this;
  }

  getHeader(name: string): string | null {
    return this.req.headers.get(name);
  }

  html(content: string): void {
    this.ensureConfigurable();
    this.setHeader("Content-Type", "text/html");
    this.res.body(content);
    this.finalize();
  }

  text(content: string): void {
    this.ensureConfigurable();
    if (!this.res.getHeader("Content-Type")) this.setHeader("Content-Type", "text/plain");
    this.res.body(content);
    this.finalize();
  }

  json(data: any): void {
    this.ensureConfigurable();
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
    
    // UPDATED: Use setHeader so MutResponse can route this to the cookie array
    this.setHeader("Set-Cookie", cookieString); 
  }

  clearCookie(name: string, path: string = "/", domain?: string): void {
    this.setCookie(name, "", { path, domain, maxAge: 0, expires: new Date(0) });
  }
}