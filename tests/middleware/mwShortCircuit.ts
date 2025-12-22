import type { XerusMiddleware } from "../../src/Middleware";
import type { AnyContext } from "../../src/MiddlewareFn";
import type { MiddlewareNextFn } from "../../src/MiddlewareNextFn";

export class MwShortCircuit implements XerusMiddleware {
  async execute(c: AnyContext, next: MiddlewareNextFn) {
    c.setStatus(200).text("Intercepted by Middleware");
    // Not calling next()
  }
}