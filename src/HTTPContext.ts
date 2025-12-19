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
  segments: string[] = [];
  params: Record<string, string> = {};
  private _body?: string | Record<string, any> | FormData;
  
  // Generic data store (for strings/legacy middleware)
  data: Record<string, any> = {};
  
  // New Type-Safe Validator Store
  private _validatorStore = new Map<Function, any>();

  private err: Error | undefined | string;
    
  private _state: ContextState = ContextState.OPEN;

  constructor() {
    // We instantiate the response object once.
    // The reset() method will wipe it clean.
    this.res = new MutResponse();
  }

  /**
   * Resets the context with new Request data.
   * Replaces the logic previously found in the constructor.
   */
  reset(req: Request, params: Record<string, string> = {}) {
    this.req = req;
    this.res.reset(); // Wipe the response object

    // Reset State
    this._state = ContextState.OPEN;
    this._url = null;
    this._body = undefined;
    this.err = undefined;
    
    // Clear Stores
    // Creating a new object is usually faster than deleting keys for small objects
    this.data = {}; 
    this._validatorStore.clear();

    // Optimization: Parse path manually to avoid new URL() overhead
    const urlIndex = req.url.indexOf("/", 8); // Skip "http://" or "https://"
    const queryIndex = req.url.indexOf("?", urlIndex);
    
    const pathStr = queryIndex === -1 
        ? req.url.substring(urlIndex) 
        : req.url.substring(urlIndex, queryIndex);
        
    this.path = pathStr.replace(/\/+$/, "") || "/";
    this.method = this.req.method;
    this.route = `${this.method} ${this.path}`;
    
    // Recalculate segments
    // Note: We could optimize this further by pooling arrays if GC is an issue
    this.segments = this.path.split("/").filter(Boolean);
    this.params = params;
  }

  // Lazy Getter for URL
  get url(): URL {
    if (!this._url) {
      this._url = new URL(this.req.url);
    }
    return this._url;
  }

  // --- Helper to get validated class instances ---
  
  setValid<T>(type: Constructable<T>, instance: T): void {
    this._validatorStore.set(type, instance);
  }

  getValid<T>(type: Constructable<T>): T {
    const validData = this._validatorStore.get(type);

    if (!validData) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR, 
        `getValid(${type.name}) called but no validation data found for that Class. Did you forget to add the Validator middleware?`
      );
    }

    return validData as T;
  }
  // ----------------------------------------------------

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
    this.res.headers.append("Set-Cookie", cookieString);
  }

  clearCookie(name: string, path: string = "/", domain?: string): void {
    this.setCookie(name, "", { path, domain, maxAge: 0, expires: new Date(0) });
  }
}