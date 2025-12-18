import type { MiddlewareFn } from "./MiddlewareFn";
import { HTTPContext } from "./HTTPContext";

export class Middleware<C = HTTPContext> {
  private callback: MiddlewareFn<C>;

  constructor(callback: MiddlewareFn<C>) {
    this.callback = callback;
  }
  async execute(
    c: C,
    next: () => Promise<void | Response>,
  ): Promise<void | Response> {
    return this.callback(c, next);
  }
}

export const logger = new Middleware(async (c: HTTPContext, next) => {
  const start = performance.now();
  await next();
  const duration = performance.now() - start;
  console.log(`[${c.req.method}][${c.path}][${duration.toFixed(2)}ms]`);
});

export interface CORSOptions {
  origin?: string;
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
}

export const cors = (options: CORSOptions = {}) => {
  return new Middleware(async (c: HTTPContext, next) => {
    const origin = options.origin || "*";
    const methods = options.methods?.join(", ") ||
      "GET, POST, PUT, DELETE, PATCH, OPTIONS";
    const headers = options.headers?.join(", ") ||
      "Content-Type, Authorization";
    c.setHeader("Access-Control-Allow-Origin", origin);
    c.setHeader("Access-Control-Allow-Methods", methods);
    c.setHeader("Access-Control-Allow-Headers", headers);
    if (options.credentials) {
      c.setHeader("Access-Control-Allow-Credentials", "true");
    }
    if (c.method === "OPTIONS") {
      return c.setStatus(204).text("");
    }
    return await next();
  });
};
