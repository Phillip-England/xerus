import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import { Inject, type InjectableStore, type ServiceLifecycle } from "../../src/RouteFields";

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

export const treasureValue = "secretValue";

class TreasureService implements InjectableStore, ServiceLifecycle {
  storeKey = "TreasureService";
  value: string = "";

  async before(_c: HTTPContext) {
    this.value = treasureValue;
  }
}

class OrderRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/order";
  inject = [Inject(ServiceA), Inject(ServiceB)];

  async handle(c: HTTPContext) {
    c.json({ message: "Handler reached" });
  }
}

class ShortRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/short-circuit";
  inject = [Inject(ServiceShortCircuit)];

  async handle(c: HTTPContext) {
    c.text("This should never be seen");
  }
}

class StoreRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/store";
  inject = [Inject(TreasureService)];

  async handle(c: HTTPContext) {
    const svc = c.service(TreasureService);
    c.json({ storedValue: svc.value });
  }
}

export function middlewares(app: Xerus) {
  app.mount(OrderRoute, ShortRoute, StoreRoute);
}
