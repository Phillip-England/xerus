export class MutResponse {
  statusCode: number;
  headers: Headers;
  bodyContent: BodyInit | null;

  constructor() {
    this.statusCode = 200;
    this.headers = new Headers();
    this.bodyContent = "";
  }

  // New: Resets the response object for reuse
  reset(): void {
    this.statusCode = 200;
    // Creating a new Headers object is often cleaner than deleting keys manually
    this.headers = new Headers(); 
    this.bodyContent = "";
  }

  setStatus(code: number): this {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string): this {
    this.headers.set(name, value);
    return this;
  }

  getHeader(name: string): string {
    return this.headers.get(name) || "";
  }

  body(content: any): this {
    this.bodyContent = content;
    return this;
  }

  send(): Response {
    return new Response(this.bodyContent, {
      status: this.statusCode,
      headers: this.headers,
    });
  }
}