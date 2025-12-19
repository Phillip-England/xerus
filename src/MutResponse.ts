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
    this.cookies = []; // Reset cookies
    this.bodyContent = "";
  }

  setStatus(code: number): this {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string): this {
    // Special handling for Set-Cookie to allow multiples
    if (name.toLowerCase() === "set-cookie") {
      this.cookies.push(value);
    } else {
      this.headers[name] = value;
    }
    return this;
  }

  getHeader(name: string): string {
    if (name.toLowerCase() === "set-cookie") {
      // Return the last set cookie if multiple exist (simplification for internal checks)
      return this.cookies.length > 0 ? this.cookies[this.cookies.length - 1] : "";
    }
    return this.headers[name] || "";
  }

  body(content: any): this {
    this.bodyContent = content;
    return this;
  }

  send(): Response {
    // 1. Fast Path: No cookies? Use the plain object (Zero allocation overhead)
    if (this.cookies.length === 0) {
      return new Response(this.bodyContent, {
        status: this.statusCode,
        headers: this.headers,
      });
    }

    // 2. Slow Path: We have cookies. We must merge them.
    // We use the Headers object here to handle the merging correctly for the browser.
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