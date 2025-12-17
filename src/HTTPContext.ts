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
  storeData: Record<string, string>;
  private err: Error | undefined | string;

  constructor(req: Request, params: Record<string, string> = {}) {
    this.req = req;
    this.res = new MutResponse();
    this.url = new URL(this.req.url);
    this.path = this.url.pathname.replace(/\/+$/, "") || "/";
    this.method = this.req.method;
    this.route = `${this.method} ${this.path}`;
    this.segments = this.path.split("/").filter(Boolean);
    this.params = params;
    this.storeData = {};
  }

  setErr(err: Error | undefined | string) {
    this.err = err;
  }

  getErr(): Error | undefined | string {
    return this.err;
  }

  redirect(location: string, status: number = 302): Response {
    this.res.setStatus(status);
    this.res.setHeader("Location", location);
    return this.res.send();
  }

  async parseBody<T extends BodyType>(
    expectedType: T,
  ): Promise<
    T extends BodyType.JSON ? Record<string, any>
      : T extends BodyType.TEXT ? string
      : T extends BodyType.FORM ? Record<string, string>
      : T extends BodyType.MULTIPART_FORM ? FormData
      : never
  > {
    if (this._body !== undefined) {
      return this._body as any;
    }

    const contentType = this.req.headers.get("Content-Type") || "";

    let parsedData: any;

    if (contentType.includes("application/json")) {
      if (expectedType !== BodyType.JSON) {
        throw new SystemErr(
          SystemErrCode.BODY_PARSING_FAILED,
          "Unexpected JSON data",
        );
      }
      try {
        parsedData = await this.req.json();
      } catch (err: any) {
        throw new SystemErr(
          SystemErrCode.BODY_PARSING_FAILED,
          `JSON parsing failed: ${err.message}`,
        );
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      if (expectedType !== BodyType.FORM) {
        throw new SystemErr(
          SystemErrCode.BODY_PARSING_FAILED,
          "Unexpected FORM data",
        );
      }
      parsedData = Object.fromEntries(
        new URLSearchParams(await this.req.text()),
      );
    } else if (contentType.includes("multipart/form-data")) {
      if (expectedType !== BodyType.MULTIPART_FORM) {
        throw new SystemErr(
          SystemErrCode.BODY_PARSING_FAILED,
          "Unexpected MULTIPART_FORM data",
        );
      }
      parsedData = await this.req.formData();
    } else {
      if (expectedType !== BodyType.TEXT) {
        throw new SystemErr(
          SystemErrCode.BODY_PARSING_FAILED,
          "Unexpected TEXT data",
        );
      }
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

  private send(content: string): Response {
    return this.res.body(content).send();
  }

  html(content: string): Response {
    this.setHeader("Content-Type", "text/html");
    return this.send(content);
  }

  jsx(jsx: JSX.Element) {
    this.setHeader("Content-Type", "text/html");
    return this.send(renderToString(jsx));
  }

  text(content: string): Response {
    this.setHeader("Content-Type", "text/plain");
    return this.send(content);
  }

  json(data: any): Response {
    this.setHeader("Content-Type", "application/json");
    return this.send(JSON.stringify(data));
  }

  async stream(stream: ReadableStream): Promise<Response> {
    this.setHeader("Content-Type", "application/octet-stream");
    return new Response(stream, {
      status: this.res.statusCode,
      headers: this.res.headers,
    });
  }

  async file(path: string, stream = false): Promise<Response> {
    let file = Bun.file(path);
    let exists = await file.exists();
    if (!exists) {
      throw new SystemErr(
        SystemErrCode.FILE_NOT_FOUND,
        `file does not exist at ${path}`,
      );
    }
    this.res.setHeader("Content-Type", file.type || "application/octet-stream");
    return stream
      ? new Response(file.stream(), {
        status: this.res.statusCode,
        headers: this.res.headers,
      })
      : new Response(file, {
        status: this.res.statusCode,
        headers: this.res.headers,
      });
  }

  setStore(key: string, value: any): void {
    this.storeData[key] = value;
  }

  getStore(key: string): any {
    return this.storeData[key] || undefined;
  }

  query(name: string, defaultValue: string = ""): string {
    return this.url.searchParams.get(name) ?? defaultValue;
  }

  getCookie(name: string): string | undefined {
    const cookies = this.req.headers.get("Cookie");
    if (!cookies) return undefined;
    return cookies.split("; ")
      .map((c) => c.split(/=(.*)/s, 2)) // Preserve `=` inside values
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
    if (options.domain) cookieString += `; Domain=${options.domain}`;
    if (options.maxAge !== undefined) {
      cookieString += `; Max-Age=${options.maxAge}`;
    }
    if (options.expires) {
      cookieString += `; Expires=${options.expires.toUTCString()}`;
    }
    if (options.httpOnly) cookieString += `; HttpOnly`;
    if (options.secure) cookieString += `; Secure`;
    if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;
    this.res.headers.append("Set-Cookie", cookieString);
  }

  clearCookie(name: string, path: string = "/", domain?: string): void {
    this.setCookie(name, "", {
      path,
      domain,
      maxAge: 0,
      expires: new Date(0), // Ensure proper removal
    });
  }
}
