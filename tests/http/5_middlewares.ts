import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import { Inject, type ServiceLifecycle } from "../../src/RouteFields";

// REFACTORED: Service Logic
class ServiceOrderLogger implements ServiceLifecycle {
  name: string = "Unknown";
  
  async before(c: HTTPContext) {
    const existing = c.getResHeader("X-Order").get() ?? "";
    c.setHeader(
      "X-Order",
      existing ? `${existing}->${this.name}-In` : `${this.name}-In`,
    );
  }

  async after(c: HTTPContext) {
    const after = c.getResHeader("X-Order").get() ?? "";
    c.setHeader("X-Order", `${after}->${this.name}-Out`);
  }
}

class ServiceA extends ServiceOrderLogger { name = "A"; }
class ServiceB extends ServiceOrderLogger { name = "B"; }

class ServiceShortCircuit implements ServiceLifecycle {
  async before(c: HTTPContext) {
    c.setStatus(200).text("Intercepted by Service");
  }
}

export const treasureKey = "secretKey" as const;
export const treasureValue = "secretValue";

class ServiceTreasure implements ServiceLifecycle {
  async before(c: HTTPContext) {
    c.setStore(treasureKey, treasureValue);
  }
}

class OrderRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/order";
  // REFACTORED: Inject services
  inject = [Inject(ServiceA), Inject(ServiceB)];
  
  async handle(c: HTTPContext) {
    c.json({ message: "Handler reached" });
  }
}

class ShortRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/short-circuit";
  // REFACTORED
  inject = [Inject(ServiceShortCircuit)];

  async handle(c: HTTPContext) {
    c.text("This should never be seen");
  }
}

class StoreRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/store";
  // REFACTORED
  inject = [Inject(ServiceTreasure)];

  async handle(c: HTTPContext) {
    const value = c.getStore(treasureKey);
    c.json({ storedValue: value });
  }
}

export function middlewares(app: Xerus) {
  app.mount(OrderRoute, ShortRoute, StoreRoute);
}