import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import type { InjectableStore, ServiceLifecycle } from "../src/RouteFields";
import { json, setHeader, setStatus, text } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

describe("Services + middleware lifecycle", () => {
  let server: any;
  let port: number;

  // self-contained constant (replaces import from ./5_middlewares)
  const treasureValue = "secretValue";

  beforeAll(async () => {
    const app = new Xerus();

    class ServiceOrderLogger implements XerusService {
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
        const afterVal = c.res.getHeader("X-Order") ?? "";
        setHeader(c, "X-Order", `${afterVal}->${this.name}-Out`);
      }
    }

    class ServiceA extends ServiceOrderLogger {
      name = "A";
    }
    class ServiceB extends ServiceOrderLogger {
      name = "B";
    }

    class ServiceShortCircuit implements XerusService {
      async before(c: HTTPContext) {
        setStatus(c, 200);
        text(c, "Intercepted by Service");
      }
    }

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

    app.mount(OrderRoute, ShortRoute, StoreRoute);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Order of execution should follow lifecycle (A-In -> B-In -> Handler -> B-Out -> A-Out)", async () => {
    const res = await fetch(makeURL(port, "/mw/order"));
    const orderHeader = res.headers.get("X-Order");
    expect(res.status).toBe(200);

    // Note: header only contains service before/after, not handler.
    expect(orderHeader).toBe("A-In->B-In->B-Out->A-Out");
  });

  test("Short-circuiting in 'before' hook should prevent handler execution", async () => {
    const res = await fetch(makeURL(port, "/mw/short-circuit"));
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).toBe("Intercepted by Service");
  });

  test("setStore/getStore should persist data to the handler", async () => {
    const res = await fetch(makeURL(port, "/mw/store"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.storedValue).toBe(treasureValue);
  });
});
