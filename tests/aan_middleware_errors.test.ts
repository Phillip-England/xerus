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

describe("Middleware error handling", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    class ServiceSafeGuard implements ServiceLifecycle {
      async onError(c: HTTPContext, err: any) {
        setStatus(c, 422);
        json(c, {
          safeGuard: true,
          originalError: err?.message ?? String(err),
        });
      }
    }

    class CatchMeRoute extends XerusRoute {
      method = Method.GET;
      path = "/mw-err/catch-me";
      services = [ServiceSafeGuard];
      async handle(_c: HTTPContext) {
        throw new Error("I am an error thrown in the handler");
      }
    }

    class BubbleUpRoute extends XerusRoute {
      method = Method.GET;
      path = "/mw-err/bubble-up";
      async handle(_c: HTTPContext) {
        throw new Error("I should bubble to global handler");
      }
    }

    // CHANGED: Use Class-based error handler
    class GlobalErrorHandler extends XerusRoute {
      method = Method.GET;
      path = "";
      async handle(c: HTTPContext) {
        const err = c.err;
        setStatus(c, 500);
        json(c, {
          error: {
            code: "GLOBAL_ERROR",
            message: "Custom Global Handler",
            detail: err instanceof Error ? err.message : String(err ?? "Unknown Error"),
          },
        });
      }
    }

    app.onErr(GlobalErrorHandler);
    app.mount(CatchMeRoute, BubbleUpRoute);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("MW Error: Middleware try/catch should intercept downstream error", async () => {
    const res = await fetch(makeURL(port, "/mw-err/catch-me"));
    const data = await res.json();
    expect(res.status).toBe(422);
    expect(data.safeGuard).toBe(true);
    expect(data.originalError).toBe("I am an error thrown in the handler");
  });

  test("MW Error: Uncaught error should bubble to global handler", async () => {
    const res = await fetch(makeURL(port, "/mw-err/bubble-up"));
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error.message).toBe("Custom Global Handler");
    expect(data.error.detail).toBe("I should bubble to global handler");
    expect(data.error.code).toBeTruthy();
  });
});