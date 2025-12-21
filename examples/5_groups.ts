import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { Middleware } from "../src/Middleware";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// 1. Shared Middleware
const apiKeyMiddleware = new Middleware(async (c: HTTPContext, next) => {
  c.setHeader("X-API-Version", "v1");
  await next();
});

// 2. Users Route
class ApiUsersRoute extends XerusRoute {
  method = Method.GET;
  path = "/api/v1/users"; // Prefix handled explicitly in path

  onMount() {
    this.use(apiKeyMiddleware); // Middleware applied explicitly per route
  }

  async handle(c: HTTPContext) {
    c.json([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
  }
}

// 3. Status Route
class ApiStatusRoute extends XerusRoute {
  method = Method.GET;
  path = "/api/v1/status";

  onMount() {
    this.use(apiKeyMiddleware);
  }

  async handle(c: HTTPContext) {
    c.json({ healthy: true });
  }
}

// 4. Mount the classes
app.mount(ApiUsersRoute, ApiStatusRoute);

console.log("🚀 Explicit Grouping example running on http://localhost:8080");
await app.listen(8080);