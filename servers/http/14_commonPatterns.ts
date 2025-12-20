import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import type { HTTPContext } from "../../src/HTTPContext";
import { requestId, rateLimit, csrf, timeout, compress } from "../../src/Middleware";

export function commonPatterns(app: Xerus) {
  // Request ID
  app.mount(
    new Route("GET", "/patterns/request-id", async (c: HTTPContext) => {
      c.json({ id: c.getRequestId() });
    }).use(requestId()),
  );

  // Rate limit
  app.mount(
    new Route("GET", "/patterns/limited", async (c: HTTPContext) => {
      c.json({ ok: true });
    }).use(rateLimit({ windowMs: 250, max: 2 })),
  );

  // CSRF (✅ mount exactly where the tests call)
  const csrfMw = csrf({ ensureCookieOnSafeMethods: true });

  app.mount(
    new Route("GET", "/patterns/csrf", async (c: HTTPContext) => {
      // Middleware sets cookie and stores token on safe methods
      c.json({ token: c.data.csrfToken });
    }).use(csrfMw),

    new Route("POST", "/patterns/csrf", async (c: HTTPContext) => {
      c.json({ ok: true });
    }).use(csrfMw),
  );

  // Timeout (soft)
  app.mount(
    new Route("GET", "/patterns/timeout", async (c: HTTPContext) => {
      await new Promise((r) => setTimeout(r, 120));
      c.json({ shouldNot: "reach" });
    }).use(timeout(50)),
  );

  // Compression
  app.mount(
    new Route("GET", "/patterns/compress", async (c: HTTPContext) => {
      // Large enough to exceed threshold (default 1024)
      c.text("x".repeat(5000));
    }).use(compress()),
  );
}
