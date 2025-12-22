import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
// import type { TestStore } from "../TestStore"; // Not needed for types anymore
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

  // Removed <AnyContext> generic
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
  // Removed <AnyContext> generic
  async execute(c: AnyContext, next: MiddlewareNextFn) {
    // We do NOT call next(), stopping the chain here.
    c.setStatus(200).text("Intercepted by Middleware");
  }
}

export const treasureKey = "secretKey" as const;
export const treasureValue = "secretValue";

// Removed <TestStore> generic
class MwTreasure implements XerusMiddleware {
  // Removed <TestStore> generic
  async execute(c: AnyContext, next: MiddlewareNextFn) {
    c.setStore(treasureKey, treasureValue);
    await next();
  }
}

// -------------------------------------------------------------------------
// ✅ ROUTES
// -------------------------------------------------------------------------

// Removed <TestStore> generic
class OrderRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/order";

  onMount() {
    this.use(new MwOrderLogger("A"), new MwOrderLogger("B"));
  }

  // Removed <TestStore> generic
  async handle(c: HTTPContext) {
    c.json({ message: "Handler reached" });
  }
}

// Removed <TestStore> generic
class ShortRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/short-circuit";

  onMount() {
    this.use(new MwShortCircuit());
  }

  // Removed <TestStore> generic
  async handle(c: HTTPContext) {
    c.text("This should never be seen");
  }
}

// Removed <TestStore> generic
class StoreRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw/store";

  onMount() {
    this.use(new MwTreasure());
  }

  // Removed <TestStore> generic
  async handle(c: HTTPContext) {
    const value = c.getStore(treasureKey);
    c.json({ storedValue: value });
  }
}

// Removed <TestStore> generic
export function middlewares(app: Xerus) {
  app.mount(OrderRoute, ShortRoute, StoreRoute);
}