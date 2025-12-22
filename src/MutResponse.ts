export class MutResponse {
  statusCode: number;

  // store normalized keys
  headers: Record<string, string>;
  cookies: string[];
  bodyContent: BodyInit | null;

  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.cookies = [];
    this.bodyContent = "";
  }

  reset(): void {
    this.statusCode = 200;
    this.headers = {};
    this.cookies = [];
    this.bodyContent = "";
  }

  setStatus(code: number): this {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string): this {
    const key = name.toLowerCase();

    if (key === "set-cookie") {
      this.cookies.push(value);
      return this;
    }

    this.headers[key] = value;
    return this;
  }

  // ✅ optional: proper multi-value append helper (see section 3)
  appendHeader(name: string, value: string): this {
    const key = name.toLowerCase();

    if (key === "set-cookie") {
      this.cookies.push(value);
      return this;
    }

    const cur = this.headers[key];
    this.headers[key] = cur && cur.length > 0 ? `${cur}, ${value}` : value;
    return this;
  }

  appendCookie(value: string): this {
    this.cookies.push(value);
    return this;
  }

  getHeader(name: string): string {
    const key = name.toLowerCase();

    if (key === "set-cookie") {
      return this.cookies.length > 0
        ? this.cookies[this.cookies.length - 1]
        : "";
    }

    return this.headers[key] || "";
  }

  getBody(): BodyInit | null {
    return this.bodyContent;
  }

  body(content: any): this {
    this.bodyContent = content;
    return this;
  }

  send(): Response {
    if (this.cookies.length === 0) {
      return new Response(this.bodyContent, {
        status: this.statusCode,
        headers: this.headers, // ✅ now normalized
      });
    }

    const h = new Headers(this.headers);
    for (const cookie of this.cookies) {
      h.append("Set-Cookie", cookie);
    }

    return new Response(this.bodyContent, {
      status: this.statusCode,
      headers: h,
    });
  }
}
