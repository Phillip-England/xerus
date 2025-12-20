import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Middleware, logger } from "../src/Middleware";
import type { HTTPContext } from "../src/HTTPContext";

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

app.mount(
  new Route("GET", "/", async (c) => c.text("Public Area")),

  new Route("GET", "/admin", async (c) => c.text("Welcome, Admin.")).use(requireAuth),
);

await app.listen(8080);
