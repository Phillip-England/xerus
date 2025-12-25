import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import type { ServiceLifecycle } from "../src/RouteFields";
import { json, setStatus } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

describe("Safeguard", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    class ErrorCatcherService implements ServiceLifecycle {
      async onError(c: HTTPContext, err: any) {
        setStatus(c, 500);
        json(c, {
          error: {
            code: "SERVICE_CAUGHT",
            message: "Service caught the error",
            detail: err?.message ?? String(err),
          },
        });
      }
    }

    class FailRoute extends XerusRoute {
      method = Method.GET;
      path = "/safeguard/fail";
      services = [ErrorCatcherService];

      async handle(_c: HTTPContext) {
        throw new Error("Handler Failed");
      }
    }

    class OkRoute extends XerusRoute {
      method = Method.GET;
      path = "/safeguard/ok";

      async handle(c: HTTPContext) {
        json(c, { status: "ok" });
      }
    }

    app.mount(FailRoute, OkRoute);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Service onError should capture handler exception", async () => {
    const res = await fetch(makeURL(port, "/safeguard/fail"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error.code).toBe("SERVICE_CAUGHT");
    expect(data.error.detail).toBe("Handler Failed");
  });

  test("Normal route should pass", async () => {
    const res = await fetch(makeURL(port, "/safeguard/ok"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
  });
});
