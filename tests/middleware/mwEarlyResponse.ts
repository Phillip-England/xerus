import type { XerusMiddleware } from "../../src/Middleware";
import type { AnyContext, MiddlewareFn } from "../../src/MiddlewareFn";
import type { MiddlewareNextFn } from "../../src/MiddlewareNextFn";

export class EarlyResponseMiddleware implements XerusMiddleware {
  async execute(c: AnyContext, next: MiddlewareNextFn) {
    console.log("mwEarlyResponse executing");
    // We don't call next(), effectively stopping the chain here
    c.text("hello from middleware");
  }
}