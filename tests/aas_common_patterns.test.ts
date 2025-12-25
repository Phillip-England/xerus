import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import type { InjectableStore, ServiceLifecycle } from "../src/RouteFields";
import { errorJSON, json, setHeader } from "../src/std/Response";
import { header, clientIP, reqCookie } from "../src/std/Request";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

// Keep this outside services so it persists across requests in the test server
const rateLimitMap = new Map<string, number>();

class CsrfService implements InjectableStore, ServiceLifecycle {
  storeKey = "CsrfService";
  token: string = "";

  async before(c: HTTPContext) {
    const cookieName = "csrf_token";
    const existing = reqCookie(c, cookieName);

    if (c.method === "GET") {
      const token = existing || "test-token-123";
      this.token = token;

      if (!existing) {
        c.res.cookies.set(cookieName, token);
      }
      return;
    }

    const headerToken = header(c, "x-csrf-token");
    if (!existing || existing !== headerToken) {
      errorJSON(c, 403, "CSRF_FAILED", "Invalid Token");
    }
  }
}

class RequestIdService implements InjectableStore, ServiceLifecycle {
  storeKey = "RequestIdService";
  id: string = "";

  async before(c: HTTPContext) {
    const id = crypto.randomUUID();
    this.id = id;
    setHeader(c, "X-Request-Id", id);
  }
}

class RateLimitService implements ServiceLifecycle {
  async before(c: HTTPContext) {
    const ip = clientIP(c);
    const count = (rateLimitMap.get(ip) || 0) + 1;
    rateLimitMap.set(ip, count);

    if (count > 2) {
      errorJSON(c, 429, "RATE_LIMITED", "Too many requests");
    }
  }
}

class TimeoutService implements InjectableStore, ServiceLifecycle {
  storeKey = "TimeoutService";
  start = 0;

  async before(_c: HTTPContext) {
    this.start = Date.now();
  }

  async after(c: HTTPContext) {
    if (Date.now() - this.start > 50) {
      const done = (c as any).isDone ?? (c as any).done ?? false;
      if (!done) {
        errorJSON(c, 504, "TIMEOUT", "Gateway Timeout");
      }
    }
  }
}

// --- Routes

class RequestIdRoute extends XerusRoute {
  method = Method.GET;
  path = "/patterns/request-id";
  services = [RequestIdService];

  async handle(c: HTTPContext) {
    const svc = c.service(RequestIdService);
    json(c, { id: svc.id });
  }
}

class RateLimitRoute extends XerusRoute {
  method = Method.GET;
  path = "/patterns/limited";
  services = [RateLimitService];

  async handle(c: HTTPContext) {
    json(c, { ok: true });
  }
}

class CsrfGetRoute extends XerusRoute {
  method = Method.GET;
  path = "/patterns/csrf";
  services = [CsrfService];

  async handle(c: HTTPContext) {
    const csrf = c.service(CsrfService);
    json(c, { token: csrf.token });
  }
}

class CsrfPostRoute extends XerusRoute {
  method = Method.POST;
  path = "/patterns/csrf";
  services = [CsrfService];

  async handle(c: HTTPContext) {
    json(c, { ok: true });
  }
}

class TimeoutRoute extends XerusRoute {
  method = Method.GET;
  path = "/patterns/timeout";
  services = [TimeoutService];

  async handle(_c: HTTPContext) {
    await new Promise((r) => setTimeout(r, 100));
  }
}

describe("Common patterns", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    // ensure clean state per test file run
    rateLimitMap.clear();

    const app = new Xerus();
    app.mount(
      RequestIdRoute,
      RateLimitRoute,
      CsrfGetRoute,
      CsrfPostRoute,
      TimeoutRoute,
    );

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("RequestId: should return and echo X-Request-Id", async () => {
    const res = await fetch(makeURL(port, "/patterns/request-id"));
    const data = await res.json();
    const hdr = res.headers.get("X-Request-Id");

    expect(res.status).toBe(200);
    expect(typeof data.id).toBe("string");
    expect(data.id.length).toBeGreaterThan(0);
    expect(hdr).toBe(data.id);
  });

  test("RateLimit: third request should 429", async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
    const headers = { "X-Forwarded-For": ip };

    const r1 = await fetch(makeURL(port, "/patterns/limited"), { headers });
    const r2 = await fetch(makeURL(port, "/patterns/limited"), { headers });
    const r3 = await fetch(makeURL(port, "/patterns/limited"), { headers });

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(429);

    const j = await r3.json();
    expect(j.error.code).toBe("RATE_LIMITED");
  });

  test("CSRF: should reject missing token and accept matching token", async () => {
    const r1 = await fetch(makeURL(port, "/patterns/csrf"));
    expect(r1.status).toBe(200);

    const setCookie = r1.headers.get("set-cookie") ?? "";
    expect(setCookie.length).toBeGreaterThan(0);

    const cookiePair = setCookie.split(";")[0];
    const token = cookiePair.split("=", 2)[1] ?? "";
    expect(token.length).toBeGreaterThan(0);

    const r2 = await fetch(makeURL(port, "/patterns/csrf"), {
      method: "POST",
      headers: { Cookie: cookiePair },
    });
    expect(r2.status).toBe(403);

    const r3 = await fetch(makeURL(port, "/patterns/csrf"), {
      method: "POST",
      headers: {
        Cookie: cookiePair,
        "x-csrf-token": token,
      },
    });
    expect(r3.status).toBe(200);
  });

  test("Timeout: should return 504", async () => {
    const res = await fetch(makeURL(port, "/patterns/timeout"));
    const j = await res.json();
    expect(res.status).toBe(504);
    expect(j.error.code).toBe("TIMEOUT");
  });
});
