import { Xerus } from "../src/Xerus";
import { Method } from "../src/Method";
import { Middleware, logger } from "../src/Middleware";
import type { HTTPContext } from "../src/HTTPContext";
import { XerusRoute } from "../src/XerusRoute";

const app = new Xerus();

const requireAuth = new Middleware(async (c: HTTPContext, next) => {
  const token = c.getHeader("Authorization");
  if (token !== "secret-token") {
    c.setStatus(401).json({ error: "Unauthorized" });
    return; // short-circuit
  }
  await next();
});

// Global middleware
app.use(logger);

// Routes (new style)
class PublicRoute extends XerusRoute<any, HTTPContext> {
  override method = Method.GET;
  override path = "/";

  override async handle(c: HTTPContext) {
    c.text("Public Area");
  }
}

class AdminRoute extends XerusRoute<any, HTTPContext> {
  override method = Method.GET;
  override path = "/admin";

  override async handle(c: HTTPContext) {
    c.text("Welcome, Admin.");
  }
}

// attach per-route middleware
AdminRoute.prototype.use(requireAuth);

// mount
app.mount(PublicRoute, AdminRoute);

await app.listen(8080);
