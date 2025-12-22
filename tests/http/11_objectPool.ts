import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import type { TestStore } from "../TestStore";

class PoolSet extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/pool/set";

  async handle(c: HTTPContext<TestStore>) {
    const val = c.query("val");
    c.setStore("test_val", val);
    c.json({ value: val });
  }
}

class PoolGet extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/pool/get";

  async handle(c: HTTPContext<TestStore>) {
    const val = c.getStore("test_val");
    c.json({ value: val });
  }
}

class PoolSetHeader extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/pool/set-header";

  async handle(c: HTTPContext<TestStore>) {
    c.setHeader("X-Leaked-Header", "I should be gone");
    c.text("Header set");
  }
}

class PoolCheckHeader extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/pool/check-header";

  async handle(c: HTTPContext<TestStore>) {
    c.text("Checking headers");
  }
}

class PoolError extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/pool/error";

  async handle(c: HTTPContext<TestStore>) {
    c.setStatus(400).text("Bad Request");
  }
}

export function objectPool(app: Xerus<TestStore>) {
  app.setHTTPContextPool(50);
  app.mount(PoolSet, PoolGet, PoolSetHeader, PoolCheckHeader, PoolError);
}
