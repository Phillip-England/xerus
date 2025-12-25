import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import { json, text } from "../../src/std/Response";
import { CORSService } from "../../src/std/CORSService";
import { CSRFService } from "../../src/std/CSRFService";
import { RateLimitService } from "../../src/std/RateLimitService";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

describe("Standard Services (CORS, CSRF, RateLimit)", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    // --- CORS SETUP ---

    // 1. Default Public CORS (Allow All)
    class PublicCorsRoute extends XerusRoute {
      method = Method.GET;
      path = "/cors/public";
      services = [CORSService]; // Default config
      async handle(c: HTTPContext) {
        json(c, { ok: true });
      }
    }

    // 2. Strict CORS (Specific Origin + Credentials)
    class StrictCorsService extends CORSService {
      constructor() {
        super({
          origin: "https://trusted.com",
          credentials: true,
          methods: ["GET", "POST"],
          exposedHeaders: ["X-Custom-Expose"],
        });
      }
    }

    class PrivateCorsRoute extends XerusRoute {
      method = Method.GET;
      path = "/cors/private";
      services = [StrictCorsService];
      async handle(c: HTTPContext) {
        json(c, { secret: "data" });
      }
    }

    // --- CSRF SETUP ---

    // 1. Route to get the token (GET)
    class CsrfGetRoute extends XerusRoute {
      method = Method.GET;
      path = "/csrf/init";
      services = [CSRFService];
      async handle(c: HTTPContext) {
        text(c, "token generated");
      }
    }

    // 2. Route to validate the token (POST)
    class CsrfPostRoute extends XerusRoute {
      method = Method.POST;
      path = "/csrf/submit";
      services = [CSRFService];
      async handle(c: HTTPContext) {
        json(c, { success: true });
      }
    }

    // --- RATE LIMIT SETUP ---

    // Define a custom limiter so we don't share state with other tests
    // Limit: 2 requests per minute
    class TestLimiter extends RateLimitService {
      constructor() {
        super({
          limit: 2,
          windowMs: 60000,
          standardHeaders: true,
        });
      }
    }

    class LimitedRoute extends XerusRoute {
      method = Method.GET;
      path = "/limit/test";
      services = [TestLimiter];
      async handle(c: HTTPContext) {
        json(c, { ok: true });
      }
    }

    app.mount(
      PublicCorsRoute,
      PrivateCorsRoute,
      CsrfGetRoute,
      CsrfPostRoute,
      LimitedRoute
    );

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  // =========================================
  // CORS TESTS
  // =========================================
  
  test("CORS: Default service allows wildcard origin", async () => {
    const res = await fetch(makeURL(port, "/cors/public"), {
      method: "GET",
      headers: { Origin: "https://random-site.com" },
    });
    
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });

  test("CORS: Strict service reflects allowed origin and sets credentials", async () => {
    const res = await fetch(makeURL(port, "/cors/private"), {
      method: "GET",
      headers: { Origin: "https://trusted.com" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://trusted.com");
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  test("CORS: Strict service ignores disallowed origin", async () => {
    const res = await fetch(makeURL(port, "/cors/private"), {
      method: "GET",
      headers: { Origin: "https://evil.com" },
    });

    expect(res.status).toBe(200); // Route executes, but browser would block response reading
    // The header should NOT be present or should not match the origin
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  test("CORS: Preflight (OPTIONS) works automatically", async () => {
    // Note: Xerus automatically routes to the service handler for OPTIONS if the service handles it
    // effectively intercepting before the route handler would run.
    const res = await fetch(makeURL(port, "/cors/private"), {
      method: "OPTIONS",
      headers: {
        Origin: "https://trusted.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "X-Custom",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe("X-Custom"); // Reflected by default logic
    expect(res.headers.get("Access-Control-Expose-Headers")).toBe("X-Custom-Expose");
  });

  // =========================================
  // CSRF TESTS
  // =========================================

  test("CSRF: GET request generates a token cookie", async () => {
    const res = await fetch(makeURL(port, "/csrf/init"));
    expect(res.status).toBe(200);
    
    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toContain("XSRF-TOKEN=");
    // Should NOT be HttpOnly so frontend can read it
    expect(setCookie).not.toContain("HttpOnly");
  });

  test("CSRF: POST without token fails (403)", async () => {
    const res = await fetch(makeURL(port, "/csrf/submit"), {
      method: "POST",
    });
    const body = await res.json();
    
    expect(res.status).toBe(403);
    expect(body.error.code).toBe("CSRF_DETECTED");
  });

  test("CSRF: Double-Submit (Cookie matches Header) passes", async () => {
    // 1. Get the token first
    const initRes = await fetch(makeURL(port, "/csrf/init"));
    const setCookie = initRes.headers.get("Set-Cookie") ?? "";
    
    // Extract token value manually for the test
    const tokenMatch = setCookie.match(/XSRF-TOKEN=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : "";
    expect(token.length).toBeGreaterThan(0);

    // 2. Send POST with Cookie AND Header
    const res = await fetch(makeURL(port, "/csrf/submit"), {
      method: "POST",
      headers: {
        "Cookie": `XSRF-TOKEN=${token}`,
        "X-XSRF-TOKEN": token, // Standard header
      }
    });

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  // =========================================
  // RATE LIMIT TESTS
  // =========================================

  test("RateLimit: Enforces limit and sets headers", async () => {
    const url = makeURL(port, "/limit/test");
    
    // Fake IP via X-Forwarded-For to isolate this test run
    const headers = { "X-Forwarded-For": "10.0.0.1" };

    // Request 1: OK
    const r1 = await fetch(url, { headers });
    expect(r1.status).toBe(200);
    expect(r1.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(r1.headers.get("X-RateLimit-Remaining")).toBe("1");

    // Request 2: OK
    const r2 = await fetch(url, { headers });
    expect(r2.status).toBe(200);
    expect(r2.headers.get("X-RateLimit-Remaining")).toBe("0");

    // Request 3: Blocked
    const r3 = await fetch(url, { headers });
    expect(r3.status).toBe(429);
    const body = await r3.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  test("RateLimit: Distinct IPs have distinct limits", async () => {
    const url = makeURL(port, "/limit/test");
    
    // Block IP A
    const headersA = { "X-Forwarded-For": "10.0.0.99" };
    await fetch(url, { headers: headersA }); // 1
    await fetch(url, { headers: headersA }); // 2
    const resA = await fetch(url, { headers: headersA }); // 3 (Blocked)
    expect(resA.status).toBe(429);

    // IP B should still be fresh
    const headersB = { "X-Forwarded-For": "10.0.0.100" };
    const resB = await fetch(url, { headers: headersB });
    expect(resB.status).toBe(200);
    expect(resB.headers.get("X-RateLimit-Remaining")).toBe("1");
  });
});