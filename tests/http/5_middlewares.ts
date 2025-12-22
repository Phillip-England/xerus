// tests/http/5_middlewares.ts
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import type { XerusMiddleware } from "../../src/Middleware";
import type { AnyContext } from "../../src/MiddlewareFn";
import type { MiddlewareNextFn } from "../../src/MiddlewareNextFn";

class MwOrderLogger implements XerusMiddleware {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  async execute(c: AnyContext, next: MiddlewareNextFn) {
    // ✅ HeaderRef -> primitive
    const existing = c.getResHeader("X-Order").get() ?? "";

    c.setHeader(
      "X-Order",
      existing ? `${existing}->${this.name}-In` : `${this.name}-In`,
    );

    await next();

    const after = c.getResHeader("X-Order").get() ?? "";
    c.setHeader("X-Order", `${after}->${this.name}-Out`);
  }
}

class MwShortCircuit implements XerusMiddleware {
  async execute(c: AnyContext, _next: MiddlewareNextFn) {
    c.setStatus(200).text("Intercepted by Middleware");
  }
}

export const treasureKey = "secretKey" as const;
export const treasureValue = "secretValue";

class MwTreasure implements XerusMiddleware {
  async execute(c: AnyContext, next: MiddlewareNextFn) {
    c.setStore(treasureKey, treasureValue);
    await next();
  }
}

class OrderRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/order";

  onMount() {
    this.use(new MwOrderLogger("A"), new MwOrderLogger("B"));
  }

  async handle(c: HTTPContext) {
    c.json({ message: "Handler reached" });
  }
}

class ShortRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/short-circuit";

  onMount() {
    this.use(new MwShortCircuit());
  }

  async handle(c: HTTPContext) {
    c.text("This should never be seen");
  }
}

class StoreRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/store";

  onMount() {
    this.use(new MwTreasure());
  }

  async handle(c: HTTPContext) {
    const value = c.getStore(treasureKey);
    c.json({ storedValue: value });
  }
}

export function middlewares(app: Xerus) {
  app.mount(OrderRoute, ShortRoute, StoreRoute);
}
