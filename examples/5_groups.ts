import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";
import { Middleware } from "../src/Middleware";

const app = new Xerus();

const apiKeyMiddleware = new Middleware(async (c, next) => {
  c.setHeader("X-API-Version", "v1");
  await next();
});

// Create a group with a prefix and shared middleware
const api = app.group("/api/v1", apiKeyMiddleware);

// Define routes on the group
// Final Path: /api/v1/users
api.get("/users", (c: HTTPContext) => {
  return c.json([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]);
});

// Final Path: /api/v1/status
api.get("/status", (c: HTTPContext) => {
  return c.json({ healthy: true });
});

await app.listen(8080);