import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import { Inject, type ServiceLifecycle } from "../../src/RouteFields";

class CsrfService implements ServiceLifecycle {
  async before(c: HTTPContext) {
    const cookieName = "csrf_token";
    const existing = c.getCookie(cookieName).get();
    
    if (c.method === "GET") {
        const token = existing || "test-token-123";
        if (!existing) {
            c.setCookie(cookieName, token);
        }
        c.setStore("csrfToken", token);
        return;
    }

    const headerToken = c.getHeader("x-csrf-token").get();
    if (!existing || existing !== headerToken) {
        c.errorJSON(403, "CSRF_FAILED", "Invalid Token");
    }
  }
}

class RequestIdService implements ServiceLifecycle {
    async before(c: HTTPContext) {
        const id = crypto.randomUUID();
        c.setStore("requestId", id);
        c.setHeader("X-Request-Id", id);
    }
}

const rateLimitMap = new Map<string, number>();

class RateLimitService implements ServiceLifecycle {
    async before(c: HTTPContext) {
        const ip = "127.0.0.1"; // Mock IP
        const count = (rateLimitMap.get(ip) || 0) + 1;
        rateLimitMap.set(ip, count);

        if (count > 2) {
            c.errorJSON(429, "RATE_LIMITED", "Too many requests");
        }
    }
}

class TimeoutService implements ServiceLifecycle {
    async before(c: HTTPContext) {
       const start = Date.now();
       c.setStore("__start", start);
    }

    async after(c: HTTPContext) {
        const start = c.getStore<number>("__start");
        // Check if handler took too long (> 50ms)
        if (Date.now() - start > 50) {
            // Only send error if response hasn't been sent yet
            if (!c.isDone) {
                 c.errorJSON(504, "TIMEOUT", "Gateway Timeout");
            }
        }
    }
}

class RequestIdRoute extends XerusRoute {
  method = Method.GET;
  path = "/patterns/request-id";
  inject = [Inject(RequestIdService)];
  async handle(c: HTTPContext) {
    c.json({ id: c.getStore("requestId") });
  }
}

class RateLimitRoute extends XerusRoute {
  method = Method.GET;
  path = "/patterns/limited";
  inject = [Inject(RateLimitService)];
  async handle(c: HTTPContext) {
    c.json({ ok: true });
  }
}

class CsrfGetRoute extends XerusRoute {
  method = Method.GET;
  path = "/patterns/csrf";
  inject = [Inject(CsrfService)];
  async handle(c: HTTPContext) {
    const token = c.getStore("csrfToken");
    c.json({ token });
  }
}

class CsrfPostRoute extends XerusRoute {
  method = Method.POST;
  path = "/patterns/csrf";
  inject = [Inject(CsrfService)];
  async handle(c: HTTPContext) {
    c.json({ ok: true });
  }
}

class TimeoutRoute extends XerusRoute {
  method = Method.GET;
  path = "/patterns/timeout";
  inject = [Inject(TimeoutService)];
  async handle(c: HTTPContext) {
    // Simulate slow work. Should be caught by TimeoutService.after
    await new Promise((r) => setTimeout(r, 100)); 
  }
}

export function commonPatterns(app: Xerus) {
  app.mount(
    RequestIdRoute,
    RateLimitRoute,
    CsrfGetRoute,
    CsrfPostRoute,
    TimeoutRoute,
  );
}