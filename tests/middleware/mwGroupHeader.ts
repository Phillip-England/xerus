import type { XerusMiddleware } from "../../src/Middleware";
import type { AnyContext } from "../../src/MiddlewareFn";
import type { MiddlewareNextFn } from "../../src/MiddlewareNextFn";

export class GroupHeaderMiddleware implements XerusMiddleware {
  async execute(c: AnyContext, next: MiddlewareNextFn) {
    c.setHeader("X-Group-Auth", "passed");
    await next();
  }
}