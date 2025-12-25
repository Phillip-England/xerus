import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import type { ServiceLifecycle, InjectableStore } from "../src/RouteFields";
import { json, setHeader, setStatus } from "../src/std/Response";

describe("Architecture: Services & Middleware", () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    const app = new Xerus();

    // --- Services ---
    class AuthMiddleware implements XerusService {
      async before(c: HTTPContext) {
        setHeader(c, "X-Auth-Check", "Passed");
      }
    }

    class UserService implements InjectableStore {
        storeKey = "UserService";
        users = ["Alice", "Bob"];
        getUsers() { return this.users; }
    }

    class ErrorService implements XerusService {
        async onError(c: HTTPContext, err: unknown) {
            setStatus(c, 500);
            json(c, { handled: true, error: (err as Error).message });
        }
    }

    // --- Routes ---
    class ProtectedRoute extends XerusRoute {
      method = Method.GET;
      path = "/protected";
      services = [AuthMiddleware];
      async handle(c: HTTPContext) {
        json(c, { ok: true });
      }
    }

    class InjectionRoute extends XerusRoute {
        method = Method.GET;
        path = "/users";
        services = [UserService];
        async handle(c: HTTPContext) {
            const svc = c.service(UserService);
            json(c, { users: svc.getUsers() });
        }
    }

    class BoomRoute extends XerusRoute {
        method = Method.GET;
        path = "/boom";
        services = [ErrorService];
        async handle(c: HTTPContext) {
            throw new Error("Explosion");
        }
    }

    app.mount(ProtectedRoute, InjectionRoute, BoomRoute);
    server = await app.listen(0);
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop(true);
  });

  test("Middleware: 'before' hook sets header", async () => {
    const res = await fetch(`${baseUrl}/protected`);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Auth-Check")).toBe("Passed");
  });

  test("Dependency Injection: Service available in handle", async () => {
    const res = await fetch(`${baseUrl}/users`);
    const data = await res.json();
    expect(data.users).toEqual(["Alice", "Bob"]);
  });

  test("Error Handling: Service intercepts error", async () => {
    const res = await fetch(`${baseUrl}/boom`);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.handled).toBe(true);
    expect(data.error).toBe("Explosion");
  });
});