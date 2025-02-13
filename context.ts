import { MutResponse } from "./response";

export interface CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export class Context {
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

  async parseBody(): Promise<string | Record<string, any> | FormData | undefined> {
    if (this._body !== undefined) return this._body; // Cache parsed body
    const contentType = this.req.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      try {
        this._body = await this.req.json();
      } catch (error) {
        throw new Error("Invalid JSON body");
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await this.req.text();
      this._body = Object.fromEntries(new URLSearchParams(text));
    } else if (contentType.includes("multipart/form-data")) {
      this._body = await this.req.formData();
    } else {
      this._body = await this.req.text(); // Default to plain text
    }
    return this._body;
  }

  param(name: string, defaultValue?: string): string | undefined {
    return this.params[name] ?? defaultValue;
  }

  status(code: number): this {
    this.res.status(code);
    return this;
  }

  header(name: string, value: string): this {
    this.res.header(name, value);
    return this;
  }

  send(content: string): Response {
    return this.res.body(content).send();
  }

  html(content: string): Response {
    this.res.header("Content-Type", "text/html");
    return this.send(content);
  }

  json(data: any): Response {
    this.res.header("Content-Type", "application/json");
    return this.send(JSON.stringify(data));
  }

  async stream(stream: ReadableStream): Promise<Response> {
    this.res.header("Content-Type", "application/octet-stream");
    return new Response(stream, {
      status: this.res.statusCode,
      headers: this.res.headers,
    });
  }

  async file(filePath: string, stream: boolean = false): Promise<Response | undefined> {
    const file = await Bun.file(filePath);
    if (!(await file.exists())) {
      return undefined;
    }
    this.res.header("Content-Type", file.type || "application/octet-stream");
    if (stream) {
      return new Response(file.stream(), {
        status: this.res.statusCode,
        headers: this.res.headers,
      });
    }
    return new Response(file, {
      status: this.res.statusCode,
      headers: this.res.headers,
    });
  }

  store(key: string, value: any): void {
    this.storeData[key] = value;
  }

  retrieve(key: string): any {
    return this.storeData[key] || undefined;
  }

  query(name: string, defaultValue?: string): string | undefined {
    return this.url.searchParams.get(name) ?? defaultValue;
  }

  cookie(name: string): string | undefined {
    const cookies = this.req.headers.get("Cookie");
    if (!cookies) return undefined;

    const cookieMap = Object.fromEntries(
      cookies.split("; ").map((c) => c.split("="))
    );

    return cookieMap[name];
  }

  setCookie(name: string, value: string, options: CookieOptions = {}): void {
    let cookieString = `${name}=${encodeURIComponent(value)}`;

    if (options.path) cookieString += `; Path=${options.path}`;
    if (options.domain) cookieString += `; Domain=${options.domain}`;
    if (options.maxAge !== undefined) cookieString += `; Max-Age=${options.maxAge}`;
    if (options.expires) cookieString += `; Expires=${options.expires.toUTCString()}`;
    if (options.httpOnly) cookieString += `; HttpOnly`;
    if (options.secure) cookieString += `; Secure`;
    if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;

    this.res.header("Set-Cookie", cookieString);
  }

  clearCookie(name: string): void {
    this.setCookie(name, "", {
      maxAge: 0,
      expires: new Date(0),
    });
  }
}
