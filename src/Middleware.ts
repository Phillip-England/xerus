import type { MiddlewareFn } from "./MiddlewareFn";
import { HTTPContext } from "./HTTPContext";

export class Middleware<C = any> {
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
