import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import type { TestStore } from "../TestStore";
import type { XerusMiddleware } from "../../src/Middleware";
import type { AnyContext } from "../../src/MiddlewareFn";
import type { MiddlewareNextFn } from "../../src/MiddlewareNextFn";

// -------------------------------------------------------------------------
// ✅ INLINED MIDDLEWARE DEFINITIONS
// -------------------------------------------------------------------------

class MwOrderLogger implements XerusMiddleware {
  private name: string;
  
  constructor(name: string) {
    this.name = name;
  }

  async execute(c: AnyContext, next: MiddlewareNextFn) {
    const existing = c.getResHeader("X-Order") || "";
    // Log "In"
    c.setHeader("X-Order", existing ? `${existing}->${this.name}-In` : `${this.name}-In`);
    
    await next(); // Pass control
    
    // Log "Out"
    const after = c.getResHeader("X-Order") || "";
    c.setHeader("X-Order", `${after}->${this.name}-Out`);
  }
}

class MwShortCircuit implements XerusMiddleware {
  async execute(c: AnyContext, next: MiddlewareNextFn) {
    // We do NOT call next(), stopping the chain here.
    c.setStatus(200).text("Intercepted by Middleware");
  }
}

export const treasureKey = "secretKey" as const;
export const treasureValue = "secretValue";

class MwTreasure implements XerusMiddleware<TestStore> {
  async execute(c: AnyContext<TestStore>, next: MiddlewareNextFn) {
    c.setStore(treasureKey, treasureValue);
    await next();
  }
}

// -------------------------------------------------------------------------
// ✅ ROUTES
// -------------------------------------------------------------------------

class OrderRoute extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/mw/order";

  onMount() {
    // ✅ FIX: Use 'new' to instantiate the classes
    this.use(new MwOrderLogger("A"), new MwOrderLogger("B"));
  }

  async handle(c: HTTPContext<TestStore>) {
    c.json({ message: "Handler reached" });
  }
}

class ShortRoute extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/mw/short-circuit";

  onMount() {
    // ✅ FIX: Use 'new' to instantiate the class
    this.use(new MwShortCircuit());
  }

  async handle(c: HTTPContext<TestStore>) {
    c.text("This should never be seen");
  }
}

class StoreRoute extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/mw/store";

  onMount() {
    // ✅ FIX: Use 'new' to instantiate the class
    this.use(new MwTreasure());
  }

  async handle(c: HTTPContext<TestStore>) {
    const value = c.getStore(treasureKey);
    c.json({ storedValue: value });
  }
}

export function middlewares(app: Xerus<TestStore>) {
  app.mount(OrderRoute, ShortRoute, StoreRoute);
}