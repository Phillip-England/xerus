import { MutResponse } from "./MutResponse";
import { BodyType } from "./BodyType";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { JSX } from "react";
import { renderToString } from "react-dom/server";
import type { CookieOptions } from "./CookieOptions";

export class HTTPContext {
  req: Request;
  res: MutResponse;
  url: URL;
  path: string;
  method: string;
  route: string;
  segments: string[];
  params: Record<string, string>;
  private _body?: string | Record<string, any> | FormData;
  data: Record<string, any>;
  private err: Error | undefined | string;
  private _isDone: boolean = false;

  constructor(req: Request, params: Record<string, string> = {}) {
    this.req = req;
    this.res = new MutResponse();
    this.url = new URL(this.req.url);
    this.path = this.url.pathname.replace(/\/+$/, "") || "/";
    this.method = this.req.method;
    this.route = `${this.method} ${this.path}`;
    this.segments = this.path.split("/").filter(Boolean);
    this.params = params;
    this.data = {};
  }

  get isDone(): boolean {
    return this._isDone;
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
    this._isDone = true;
    this.res.setStatus(status);
    this.res.setHeader("Location", location);
  }

  async parseBody<T extends BodyType>(expectedType: T): Promise<any> {
    if (this._body !== undefined) return this._body;
    const contentType = this.req.headers.get("Content-Type") || "";
    let parsedData: any;

    if (contentType.includes("application/json")) {
      if (expectedType !== BodyType.JSON) throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected JSON data");
      try { parsedData = await this.req.json(); } 
      catch (err: any) { throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, `JSON parsing failed: ${err.message}`); }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      if (expectedType !== BodyType.FORM) throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected FORM data");
      parsedData = Object.fromEntries(new URLSearchParams(await this.req.text()));
    } else if (contentType.includes("multipart/form-data")) {
      if (expectedType !== BodyType.MULTIPART_FORM) throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected MULTIPART_FORM data");
      parsedData = await this.req.formData();
    } else {
      if (expectedType !== BodyType.TEXT) throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected TEXT data");
      parsedData = await this.req.text();
    }
    this._body = parsedData;
    return parsedData;
  }

  getParam(name: string, defaultValue: string = ""): string {
    return this.params[name] || defaultValue;
  }

  setStatus(code: number): this {
    this.res.setStatus(code);
    return this;
  }

  setHeader(name: string, value: string): this {
    this.res.setHeader(name, value);
    return this;
  }

  getHeader(name: string): string | null {
    return this.req.headers.get(name);
  }

  html(content: string): void {
    this.setHeader("Content-Type", "text/html");
    this.res.body(content);
    this._isDone = true;
  }

  jsx(jsx: JSX.Element): void {
    this.setHeader("Content-Type", "text/html");
    this.res.body(renderToString(jsx));
    this._isDone = true;
  }

  text(content: string): void {
    if (!this.res.getHeader("Content-Type")) this.setHeader("Content-Type", "text/plain");
    this.res.body(content);
    this._isDone = true;
  }

  json(data: any): void {
    this.setHeader("Content-Type", "application/json");
    this.res.body(JSON.stringify(data));
    this._isDone = true;
  }

  stream(stream: ReadableStream): void {
    this._isDone = true;
    this.setHeader("Content-Type", "application/octet-stream");
    this.res.body(stream);
  }

  async file(path: string): Promise<void> {
    this._isDone = true;
    let file = Bun.file(path);
    if (!(await file.exists())) {
      throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, `file does not exist at ${path}`);
    }
    this.res.setHeader("Content-Type", file.type || "application/octet-stream");
    this.res.body(file);
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