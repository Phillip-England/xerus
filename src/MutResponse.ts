export class MutResponse {
  statusCode: number;
  headers: Record<string, string>;
  // Store cookies separately to allow multiple 'Set-Cookie' headers
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

  /**
   * Prefer using appendCookie() for Set-Cookie to avoid footguns.
   * This still supports "Set-Cookie" for backwards compatibility.
   */
  setHeader(name: string, value: string): this {
    if (name.toLowerCase() === "set-cookie") {
      this.cookies.push(value);
    } else {
      this.headers[name] = value;
    }
    return this;
  }

  /**
   * Explicit cookie API (recommended)
   */
  appendCookie(value: string): this {
    this.cookies.push(value);
    return this;
  }

  getHeader(name: string): string {
    if (name.toLowerCase() === "set-cookie") {
      return this.cookies.length > 0 ? this.cookies[this.cookies.length - 1] : "";
    }
    return this.headers[name] || "";
  }

  /**
   * Safe getter for middleware that needs to inspect the outgoing body.
   */
  getBody(): BodyInit | null {
    return this.bodyContent;
  }

  body(content: any): this {
    this.bodyContent = content;
    return this;
  }

  send(): Response {
    // Fast Path: No cookies
    if (this.cookies.length === 0) {
      return new Response(this.bodyContent, {
        status: this.statusCode,
        headers: this.headers,
      });
    }

    // Slow Path: merge Set-Cookie correctly
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
