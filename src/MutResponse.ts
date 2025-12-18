export class MutResponse {
  statusCode: number;
  headers: Headers;
  bodyContent: BodyInit | null;

  constructor() {
    this.statusCode = 200;
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