import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// Performance Tweak: Pre-allocate 500 HTTPContext objects.
// This minimizes GC pressure under high concurrency.
app.setHTTPContextPool(500);

// Define the route as a class blueprint
class PooledRoute extends XerusRoute {
  method = Method.GET;
  path = "/";

  async handle(c: HTTPContext) {
    c.text("Optimized with HTTPContext pooling 🚀");
  }
}

// Mount the class
app.mount(PooledRoute);

console.log("🚀 Pooling example running on http://localhost:8080");
await app.listen(8080);