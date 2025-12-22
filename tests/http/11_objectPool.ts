import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Inject } from "../../src/RouteFields"; // Import Inject
import { TestStore } from "../TestStore"; // Import the Class

class PoolSet extends XerusRoute {
  method = Method.GET;
  path = "/pool/set";

  // Inject the store. The framework creates a NEW instance for every request.
  store = Inject(TestStore);

  async handle(c: HTTPContext) {
    const val = c.query("val");

    // Type-safe access!
    this.store.test_val = val;

    c.json({ value: val });
  }
}

class PoolGet extends XerusRoute {
  method = Method.GET;
  path = "/pool/get";

  store = Inject(TestStore);

  async handle(c: HTTPContext) {
    // Type-safe retrieval
    const val = this.store.test_val;

    c.json({ value: val });
  }
}

class PoolSetHeader extends XerusRoute {
  method = Method.GET;
  path = "/pool/set-header";

  async handle(c: HTTPContext) {
    c.setHeader("X-Leaked-Header", "I should be gone");
    c.text("Header set");
  }
}

class PoolCheckHeader extends XerusRoute {
  method = Method.GET;
  path = "/pool/check-header";

  async handle(c: HTTPContext) {
    // This confirms that c.res headers were wiped during reset()
    const leaked = c.getResHeader("X-Leaked-Header");
    if (leaked) {
      c.setStatus(500).text("Header Leaked!");
      return;
    }
    c.text("Headers clean");
  }
}

class PoolError extends XerusRoute {
  method = Method.GET;
  path = "/pool/error";

  async handle(c: HTTPContext) {
    c.setStatus(400).text("Bad Request");
  }
}

// Remove the generic <TestStore> from Xerus
export function objectPool(app: Xerus) {
  app.setHTTPContextPool(50);
  app.mount(PoolSet, PoolGet, PoolSetHeader, PoolCheckHeader, PoolError);
}
