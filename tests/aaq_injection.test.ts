import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import type { InjectableStore } from "../src/RouteFields";
import { json } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

/* ======================
   Services
====================== */

class UserService implements InjectableStore {
  storeKey = "UserService";
  private users = ["Alice", "Bob"];

  getUsers() {
    return this.users;
  }
}

class MetricsService implements InjectableStore {
  storeKey = "MetricsService";
  initialized = false;
  startTime = 0;

  async init(_c: HTTPContext) {
    this.initialized = true;
    this.startTime = Date.now();
  }

  getUptime() {
    return Date.now() - this.startTime;
  }
}

/* ======================
   Route
====================== */

class InjectionRoute extends XerusRoute {
  method = Method.GET;
  path = "/injection/test";
  services = [UserService, MetricsService];

  async handle(c: HTTPContext) {
    const userService = c.service(UserService);
    const metrics = c.service(MetricsService);

    json(c, {
      users: userService.getUsers(),
      serviceName: userService.storeKey,
      initialized: metrics.initialized,
      processingTime: metrics.getUptime(),
    });
  }
}

/* ======================
   Tests
====================== */

describe("Service Injection", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();
    app.mount(InjectionRoute);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Injection: Should inject services and run init lifecycle", async () => {
    const res = await fetch(makeURL(port, "/injection/test"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.users).toEqual(["Alice", "Bob"]);
    expect(data.serviceName).toBe("UserService");
    expect(data.initialized).toBe(true);
    expect(data.processingTime).toBeGreaterThanOrEqual(0);
  });
});
