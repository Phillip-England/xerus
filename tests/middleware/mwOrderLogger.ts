import type { XerusMiddleware } from "../../src/Middleware";
import type { AnyContext } from "../../src/MiddlewareFn";
import type { MiddlewareNextFn } from "../../src/MiddlewareNextFn";

// Class-based middleware that accepts constructor arguments
export class MwOrderLogger implements XerusMiddleware {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  async execute(c: AnyContext, next: MiddlewareNextFn) {
    const existing = c.getResHeader("X-Order") || "";
    c.setHeader("X-Order", existing ? `${existing}->${this.name}-In` : `${this.name}-In`);
    
    await next(); // Pass control
    
    const after = c.getResHeader("X-Order") || "";
    c.setHeader("X-Order", `${after}->${this.name}-Out`);
  }
}