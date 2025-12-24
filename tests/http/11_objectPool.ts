import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { TestStore } from "../TestStore";
import { query } from "../../src/std/Request";
import { json, setHeader, setStatus, text } from "../../src/std/Response";

class PoolSet extends XerusRoute {
  method = Method.GET;
  path = "/pool/set";
  services = [TestStore];

  async handle(c: HTTPContext) {
    const store = c.service(TestStore);
    const val = query(c, "val");
    store.test_val = val;
    json(c, { value: val });
  }
}

class PoolGet extends XerusRoute {
  method = Method.GET;
  path = "/pool/get";
  services = [TestStore];

  async handle(c: HTTPContext) {
    const store = c.service(TestStore);
    const val = store.test_val;
    json(c, { value: val });
  }
}

class PoolSetHeader extends XerusRoute {
  method = Method.GET;
  path = "/pool/set-header";
  async handle(c: HTTPContext) {
    setHeader(c, "X-Leaked-Header", "I should be gone");
    text(c, "Header set");
  }
}

class PoolCheckHeader extends XerusRoute {
  method = Method.GET;
  path = "/pool/check-header";
  async handle(c: HTTPContext) {
    const leaked = c.res.getHeader("X-Leaked-Header");
    if (leaked) {
      setStatus(c, 500);
      text(c, "Header Leaked!");
      return;
    }
    text(c, "Headers clean");
  }
}

class PoolError extends XerusRoute {
  method = Method.GET;
  path = "/pool/error";
  async handle(c: HTTPContext) {
    setStatus(c, 400);
    text(c, "Bad Request");
  }
}

export function objectPool(app: Xerus) {
  app.setHTTPContextPool(50);
  app.mount(PoolSet, PoolGet, PoolSetHeader, PoolCheckHeader, PoolError);
}
