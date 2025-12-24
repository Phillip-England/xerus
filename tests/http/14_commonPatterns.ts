import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import { Inject, type InjectableStore, type ServiceLifecycle } from "../../src/RouteFields";
import { errorJSON, json, setHeader } from "../../src/std/Response";
import { header } from "../../src/std/Request";

class CsrfService implements InjectableStore, ServiceLifecycle {
  storeKey = "CsrfService";
  token: string = "";
  async before(c: HTTPContext) {
    const cookieName = "csrf_token";
    const existing = c.res.cookies.get(cookieName); // Cookies accessed via MutResponse
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

const rateLimitMap = new Map<string, number>();
class RateLimitService implements ServiceLifecycle {
  async before(c: HTTPContext) {
    const ip = "127.0.0.1"; // Mock IP
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
      if (!c.isDone) {
        errorJSON(c, 504, "TIMEOUT", "Gateway Timeout");
      }
    }
  }
}

class RequestIdRoute extends XerusRoute {
  method = Method.GET;
  path = "/patterns/request-id";
  inject = [Inject(RequestIdService)];
  async handle(c: HTTPContext) {
    const svc = c.service(RequestIdService);
    json(c, { id: svc.id });
  }
}

class RateLimitRoute extends XerusRoute {
  method = Method.GET;
  path = "/patterns/limited";
  inject = [Inject(RateLimitService)];
  async handle(c: HTTPContext) {
    json(c, { ok: true });
  }
}

class CsrfGetRoute extends XerusRoute {
  method = Method.GET;
  path = "/patterns/csrf";
  inject = [Inject(CsrfService)];
  async handle(c: HTTPContext) {
    const csrf = c.service(CsrfService);
    json(c, { token: csrf.token });
  }
}

class CsrfPostRoute extends XerusRoute {
  method = Method.POST;
  path = "/patterns/csrf";
  inject = [Inject(CsrfService)];
  async handle(c: HTTPContext) {
    json(c, { ok: true });
  }
}

class TimeoutRoute extends XerusRoute {
  method = Method.GET;
  path = "/patterns/timeout";
  inject = [Inject(TimeoutService)];
  async handle(_c: HTTPContext) {
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