import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { BodyType } from "../src/BodyType";
import type { HTTPContext } from "../src/HTTPContext";
import { Method } from "../src/Method";
import type { ServiceLifecycle } from "../src/RouteFields";
import { json, setHeader, text } from "../src/std/Response";
import { SystemErr } from "../src/SystemErr";
import { SystemErrCode } from "../src/SystemErrCode";
import type { XerusValidator } from "../src/XerusValidator";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { parseBody } from "../src/std/Body";



function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

describe("Route grouping: prefix + middleware/service", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    // --- services / validators used by routes (defined inline to keep test self-contained)

    class GroupHeaderService implements XerusService {
      async before(c: HTTPContext) {
        setHeader(c, "X-Group-Auth", "passed");
      }
    }

    class AnyJsonBody implements XerusValidator {
      async validate(c: HTTPContext) {
        const data = parseBody(c, BodyType.JSON);
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new SystemErr(
            SystemErrCode.VALIDATION_FAILED,
            "Expected JSON object body",
          );
        }
        return data;
      }
    }

    // --- routes

    class ApiV1 extends XerusRoute {
      method = Method.GET;
      path = "/api/v1";
      async handle(c: HTTPContext) {
        json(c, { version: "v1" });
      }
    }

    class ApiEcho extends XerusRoute {
      method = Method.POST;
      path = "/api/echo";
      validators = [AnyJsonBody];

      async handle(c: HTTPContext) {
        const received = c.validated(AnyJsonBody);
        json(c, { received });
      }
    }

    class AdminDashboard extends XerusRoute {
      method = Method.GET;
      path = "/admin/dashboard";
      services = [GroupHeaderService];

      async handle(c: HTTPContext) {
        text(c, "Welcome to the Dashboard");
      }
    }

    class AdminSettings extends XerusRoute {
      method = Method.DELETE;
      path = "/admin/settings";
      services = [GroupHeaderService];

      async handle(c: HTTPContext) {
        json(c, { deleted: true });
      }
    }

    app.mount(ApiV1, ApiEcho, AdminDashboard, AdminSettings);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Group Prefix: GET /api/v1 should return version", async () => {
    const res = await fetch(makeURL(port, "/api/v1"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.version).toBe("v1");
  });

  test("Group Prefix: POST /api/echo should parse body correctly", async () => {
    const payload = { foo: "bar" };
    const res = await fetch(makeURL(port, "/api/echo"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.received.foo).toBe("bar");
  });

  test("Group Middleware: GET /admin/dashboard should have group header", async () => {
    const res = await fetch(makeURL(port, "/admin/dashboard"));
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).toBe("Welcome to the Dashboard");
    expect(res.headers.get("X-Group-Auth")).toBe("passed");
  });

  test("Group Method: DELETE /admin/settings should work in group", async () => {
    const res = await fetch(makeURL(port, "/admin/settings"), {
      method: "DELETE",
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.deleted).toBe(true);
    expect(res.headers.get("X-Group-Auth")).toBe("passed");
  });
});
