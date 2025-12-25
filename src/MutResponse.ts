import { CookieJar } from "./Cookies";
import { HeadersBag } from "./Headers";

export class MutResponse {
  statusCode: number;
  headers: HeadersBag;
  cookies: CookieJar;
  bodyContent: BodyInit | null;

  constructor() {
    this.statusCode = 200;
    this.headers = new HeadersBag();
    this.cookies = new CookieJar();
    this.bodyContent = "";
  }

  reset(): void {
    this.statusCode = 200;
    this.headers.reset();
    this.cookies.reset();
    this.bodyContent = "";
  }

  setStatus(code: number): this {
    this.statusCode = code;
    return this;
  }

  getHeader(name: string): string | null {
    return this.headers.get(name);
  }

  setHeader(name: string, value: string): this {
    this.headers.set(name, value);
    return this;
  }

  appendHeader(name: string, value: string): this {
    this.headers.append(name, value);
    return this;
  }

  getBody(): BodyInit | null {
    return this.bodyContent;
  }

  body(content: any): this {
    this.bodyContent = content;
    return this;
  }

  send(): Response {
    const h = this.headers.toHeaders();
    const cookieLines = this.cookies.getSetCookieLines();
    for (const line of cookieLines) {
      h.append("Set-Cookie", line);
    }
    return new Response(this.bodyContent, {
      status: this.statusCode,
      headers: h,
    });
  }
}
