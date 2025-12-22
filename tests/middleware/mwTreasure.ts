import type { XerusMiddleware } from "../../src/Middleware";
import type { AnyContext } from "../../src/MiddlewareFn";
import type { MiddlewareNextFn } from "../../src/MiddlewareNextFn";
import type { TestStore } from "../TestStore";

export const treasureKey = "secretKey" as const;
export const treasureValue = "secretValue";

export class MwTreasure implements XerusMiddleware<TestStore> {
  async execute(c: AnyContext<TestStore>, next: MiddlewareNextFn) {
    c.setStore(treasureKey, treasureValue);
    await next();
  }
}