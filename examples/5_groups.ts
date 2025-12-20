// PATH: /home/jacex/src/xerus/examples/5_groups.ts

import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Middleware } from "../src/Middleware";
import type { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

const apiKeyMiddleware = new Middleware(async (c: HTTPContext, next) => {
  c.setHeader("X-API-Version", "v1");
  await next();
});

// No grouping: each route is an independent object.
// If you want a “shared prefix”, just put it in the path.
// If you want “shared middleware”, apply it per-route (explicit > magic).

app.mount(
  new Route("GET", "/api/v1/users", async (c) => {
    c.json([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]);
  }).use(apiKeyMiddleware),

  new Route("GET", "/api/v1/status", async (c) => {
    c.json({ healthy: true });
  }).use(apiKeyMiddleware),
);

await app.listen(8080);
