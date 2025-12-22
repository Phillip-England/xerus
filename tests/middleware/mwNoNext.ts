import type { XerusMiddleware } from "../../src/Middleware";
import type { AnyContext } from "../../src/MiddlewareFn";
import type { MiddlewareNextFn } from "../../src/MiddlewareNextFn";

export class NoNextMiddleware implements XerusMiddleware {
  async execute(c: AnyContext, next: MiddlewareNextFn) {
    // Intentionally not calling next() to test safety nets
  }
}