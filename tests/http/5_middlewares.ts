import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import type { InjectableStore, ServiceLifecycle } from "../../src/RouteFields";
import { json, setHeader, setStatus, text } from "../../src/std/Response";

class ServiceOrderLogger implements ServiceLifecycle {
  name: string = "Unknown";

  async before(c: HTTPContext) {
    const existing = c.res.getHeader("X-Order") ?? "";
    setHeader(
      c,
      "X-Order",
      existing ? `${existing}->${this.name}-In` : `${this.name}-In`,
    );
  }

  async after(c: HTTPContext) {
    const after = c.res.getHeader("X-Order") ?? "";
    setHeader(c, "X-Order", `${after}->${this.name}-Out`);
  }
}

class ServiceA extends ServiceOrderLogger {
  name = "A";
}
class ServiceB extends ServiceOrderLogger {
  name = "B";
}

class ServiceShortCircuit implements ServiceLifecycle {
  async before(c: HTTPContext) {
    setStatus(c, 200);
    text(c, "Intercepted by Service");
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
  services = [ServiceA, ServiceB];

  async handle(c: HTTPContext) {
    json(c, { message: "Handler reached" });
  }
}

class ShortRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/short-circuit";
  services = [ServiceShortCircuit];

  async handle(c: HTTPContext) {
    text(c, "This should never be seen");
  }
}

class StoreRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/store";
  services = [TreasureService];

  async handle(c: HTTPContext) {
    const svc = c.service(TreasureService);
    json(c, { storedValue: svc.value });
  }
}

export function middlewares(app: Xerus) {
  app.mount(OrderRoute, ShortRoute, StoreRoute);
}
