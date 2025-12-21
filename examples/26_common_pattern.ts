import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import { requestId, rateLimit, csrf, timeout, compress } from "../src/Middleware";

const app = new Xerus();

// 1. Global Middlewares: Applied to every single request
app.use(requestId());
app.use(compress({ thresholdBytes: 512 }));

// 2. Base Route: Demonstrating Request ID retrieval
class HomeRoute extends XerusRoute {
  method = Method.GET;
  path = "/";

  async handle(c: HTTPContext) {
    c.json({ 
      hello: "xerus", 
      requestId: c.getRequestId() // Pulled from context store by requestId middleware
    });
  }
}

// 3. Rate Limited Route
class LimitedRoute extends XerusRoute {
  method = Method.GET;
  path = "/limited";

  onMount() {
    this.use(rateLimit({ windowMs: 1000, max: 5 }));
  }

  async handle(c: HTTPContext) {
    c.json({ ok: true });
  }
}

// 4. CSRF Token Retrieval Route
class CsrfTokenRoute extends XerusRoute {
  method = Method.GET;
  path = "/csrf-token";

  onMount() {
    this.use(csrf());
  }

  async handle(c: HTTPContext) {
    // csrf middleware stores the token in c.data
    c.json({ token: c.data.csrfToken });
  }
}

// 5. CSRF Protected POST Route
class ProtectedPostRoute extends XerusRoute {
  method = Method.POST;
  path = "/protected";

  onMount() {
    this.use(csrf());
  }

  async handle(c: HTTPContext) {
    c.json({ ok: true });
  }
}

// 6. Timeout Route: Demonstrates safeguard against slow handlers
class SlowRoute extends XerusRoute {
  method = Method.GET;
  path = "/slow";

  onMount() {
    this.use(timeout(100)); // Will trigger 504 if handle takes > 100ms
  }

  async handle(c: HTTPContext) {
    await new Promise((r) => setTimeout(r, 200));
    c.text("done");
  }
}

// 7. Mount all classes
app.mount(
  HomeRoute,
  LimitedRoute,
  CsrfTokenRoute,
  ProtectedPostRoute,
  SlowRoute
);

console.log("🚀 Common Patterns example running on http://localhost:8080");
await app.listen(8080);