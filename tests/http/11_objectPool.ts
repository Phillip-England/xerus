import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Inject } from "../../src/RouteFields";
import { TestStore } from "../TestStore";
import { query } from "../../src/std/Request";
import { json, setHeader, setStatus, text } from "../../src/std/Response";

class PoolSet extends XerusRoute {
  method = Method.GET;
  path = "/pool/set";
  store = Inject(TestStore);
  async handle(c: HTTPContext) {
    const val = query(c, "val");
    this.store.test_val = val;
    json(c, { value: val });
  }
}

class PoolGet extends XerusRoute {
  method = Method.GET;
  path = "/pool/get";
  store = Inject(TestStore);
  async handle(c: HTTPContext) {
    const val = this.store.test_val;
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
    // Note: getResHeader is not in std, accessed via context directly as per internal API
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