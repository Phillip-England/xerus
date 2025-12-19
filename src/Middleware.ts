import type { MiddlewareFn } from "./MiddlewareFn";
import { HTTPContext } from "./HTTPContext";

export class Middleware<C = HTTPContext> {
  private callback: MiddlewareFn<C>;

  constructor(callback: MiddlewareFn<C>) {
    this.callback = callback;
  }
  
  // Refactored: Removed | Response from return type to enforce context mutation pattern
  async execute(
    c: C,
    next: () => Promise<void>,
  ): Promise<void> {
    return this.callback(c, next);
  }
}

export const logger = new Middleware(async (c: HTTPContext, next) => {
  const start = performance.now();
  
  // Refactored: We await next. If an error happens downstream, it bubbles here.
  // Because we don't catch it, it keeps bubbling up to Xerus.onErr
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
    let origin = options.origin || "*";
    const methods =
      options.methods?.join(", ") || "GET, POST, PUT, DELETE, PATCH, OPTIONS";
    const headers = options.headers?.join(", ") || "Content-Type, Authorization";

    if (options.credentials) {
      const reqOrigin = c.getHeader("Origin");
      if (origin === "*" && reqOrigin) {
        origin = reqOrigin;
      }
      c.setHeader("Access-Control-Allow-Credentials", "true");
    }

    c.setHeader("Access-Control-Allow-Origin", origin);
    c.setHeader("Access-Control-Allow-Methods", methods);
    c.setHeader("Access-Control-Allow-Headers", headers);

    if (c.method === "OPTIONS") {
      c.setStatus(204).text("");
      return;
    }
    
    await next();
  });
};