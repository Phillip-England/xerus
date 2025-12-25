import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import type { ServiceLifecycle } from "../src/RouteFields";
import { file, json, setStatus, text } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

async function readMaybeError(res: Response) {
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("application/json")) return await res.json();
  return await res.text();
}

describe("Global error handling", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    // --- services

    class ServiceErrorTrigger implements ServiceLifecycle {
      async before(_c: HTTPContext) {
        throw new Error("Failure in Service");
      }
    }

    // --- routes

    class StandardErr extends XerusRoute {
      method = Method.GET;
      path = "/err/standard";
      async handle(_c: HTTPContext) {
        throw new Error("Standard Route Failure");
      }
    }

    class SvcErr extends XerusRoute {
      method = Method.GET;
      path = "/err/middleware";
      services = [ServiceErrorTrigger];

      async handle(c: HTTPContext) {
        text(c, "This won't be reached");
      }
    }

    class MissingFile extends XerusRoute {
      method = Method.GET;
      path = "/err/file-missing";
      async handle(c: HTTPContext) {
        return await file(c, "./non/existent/path/file.txt");
      }
    }

    // --- global error handler

    app.onErr(async (c: HTTPContext, err: any) => {
      const detail =
        err instanceof Error ? err.message : String(err ?? "Unknown Error");

      const msg =
        detail === "Failure in Service"
          ? "Failure in Middleware"
          : "Custom Global Handler";

      setStatus(c, 500);
      json(c, {
        error: {
          code: "GLOBAL_ERROR",
          message: msg,
          detail,
        },
      });
    });

    app.mount(StandardErr, SvcErr, MissingFile);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("GET /err/standard should be caught by app.onErr", async () => {
    const res = await fetch(makeURL(port, "/err/standard"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error.message).toBe("Custom Global Handler");
    expect(data.error.detail).toBe("Standard Route Failure");
  });

  test("GET /err/middleware should be caught by app.onErr", async () => {
    const res = await fetch(makeURL(port, "/err/middleware"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error.detail).toBe("Failure in Service");
  });

  test("Non-existent route should trigger 404 SystemErr", async () => {
    const res = await fetch(makeURL(port, "/err/does-not-exist"));
    const body = await readMaybeError(res);

    expect(res.status).toBe(404);

    if (typeof body === "string") {
      expect(body).toContain("is not registered");
    } else {
      expect((body.error?.code ?? body.code) as any).toBeTruthy();
    }
  });

  test("Accessing missing file should trigger SystemErr (404)", async () => {
    const res = await fetch(makeURL(port, "/err/file-missing"));
    expect(res.status).toBe(404);
  });
});

