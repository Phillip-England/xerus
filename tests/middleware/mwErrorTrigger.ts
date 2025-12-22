import type { XerusMiddleware } from "../../src/Middleware";
import type { AnyContext } from "../../src/MiddlewareFn";
import type { MiddlewareNextFn } from "../../src/MiddlewareNextFn";

export class MwErrorTrigger implements XerusMiddleware {
  async execute(c: AnyContext, next: MiddlewareNextFn) {
    throw new Error("Failure in Middleware");
  }
}