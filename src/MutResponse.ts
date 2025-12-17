

export class MutResponse {
  statusCode: number;
  headers: Headers;
  bodyContent: string;

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
    return this.headers.get(name) || '';
  }

  body(content: string | object): this {
    this.bodyContent = typeof content === "object"
      ? JSON.stringify(content)
      : content;
    return this;
  }

  send(): Response {
    return new Response(this.bodyContent, {
      status: this.statusCode,
      headers: this.headers,
    });
  }
}