import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import type { TestStore } from "../TestStore";
import { requestId, rateLimit, csrf, timeout, compress } from "../../src/Middleware";

const csrfMw = csrf({ ensureCookieOnSafeMethods: true });

class RequestIdRoute extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/patterns/request-id";
  onMount() {
    this.use(requestId({ storeKey: "requestId" }));
  }
  async handle(c: HTTPContext<TestStore>) {
    c.json({ id: c.getRequestId() });
  }
}

class RateLimitRoute extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/patterns/limited";
  onMount() {
    this.use(rateLimit({ windowMs: 250, max: 2 }));
  }
  async handle(c: HTTPContext<TestStore>) {
    c.json({ ok: true });
  }
}

class CsrfGetRoute extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/patterns/csrf";
  onMount() {
    this.use(csrfMw);
  }
  async handle(c: HTTPContext<TestStore>) {
    c.json({ token: c.getStore("csrfToken") });
  }
}

class CsrfPostRoute extends XerusRoute<TestStore> {
  method = Method.POST;
  path = "/patterns/csrf";
  onMount() {
    this.use(csrfMw);
  }
  async handle(c: HTTPContext<TestStore>) {
    c.json({ ok: true });
  }
}

class TimeoutRoute extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/patterns/timeout";
  onMount() {
    this.use(timeout(50));
  }
  async handle(c: HTTPContext<TestStore>) {
    // Increased sleep to 500ms to ensure it loses the race against the 50ms timeout
    await new Promise((r) => setTimeout(r, 500));
    c.json({ shouldNot: "reach" });
  }
}

class CompressRoute extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/patterns/compress";
  onMount() {
    this.use(compress());
  }
  async handle(c: HTTPContext<TestStore>) {
    c.text("x".repeat(5000));
  }
}

export function commonPatterns(app: Xerus<TestStore>) {
  app.mount(
    RequestIdRoute,
    RateLimitRoute,
    CsrfGetRoute,
    CsrfPostRoute,
    TimeoutRoute,
    CompressRoute,
  );
}