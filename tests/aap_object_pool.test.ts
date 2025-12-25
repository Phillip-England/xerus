import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import { query } from "../src/std/Request";
import { json, setHeader, setStatus, text } from "../src/std/Response";
import { TestStore } from "./TestStore";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

describe("Object Pool behavior", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

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

    app.setHTTPContextPool(50);
    app.mount(
      PoolSet,
      PoolGet,
      PoolSetHeader,
      PoolCheckHeader,
      PoolError,
    );

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("ObjectPool: Request 1 should set data", async () => {
    const res = await fetch(makeURL(port, "/pool/set?val=A"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.value).toBe("A");
  });

  test("ObjectPool: Request 2 should NOT see data from Request 1", async () => {
    const res = await fetch(makeURL(port, "/pool/get"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.value).toBeFalsy();
  });

  test("ObjectPool: Headers should be clean on new request", async () => {
    await fetch(makeURL(port, "/pool/set-header"));
    const res = await fetch(makeURL(port, "/pool/check-header"));
    const headerVal = res.headers.get("X-Leaked-Header");
    expect(headerVal).toBeNull();
  });

  test("ObjectPool: Status code should reset to 200", async () => {
    await fetch(makeURL(port, "/pool/error"));
    const res = await fetch(makeURL(port, "/pool/get"));
    expect(res.status).toBe(200);
  });
});
