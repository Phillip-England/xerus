import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { Middleware } from "../src/Middleware";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// 1. A middleware that incorrectly fails to await the next link in the chain
const mwBroken = new Middleware(async (c: HTTPContext, next) => {
  console.log(">> [Broken MW] starting...");
  next(); // ❌ Floating promise: triggers SystemErrCode.MIDDLEWARE_ERROR in Xerus.ts
  console.log(">> [Broken MW] finished (too early!)");
});

// 2. A standard, correct middleware
const mwCorrect = new Middleware(async (c: HTTPContext, next) => {
  console.log(">> [Correct MW] starting...");
  await next(); // ✅ Correctly awaited
  console.log(">> [Correct MW] finished (correctly)");
});

// 3. Route using the broken middleware
class BrokenRoute extends XerusRoute {
  method = Method.GET;
  path = "/broken";

  onMount() {
    this.use(mwBroken);
  }

  async handle(c: HTTPContext) {
    // This delay ensures the middleware would finish before the handler
    await new Promise((r) => setTimeout(r, 50));
    c.json({ message: "You should not see this because the safeguard catches it." });
  }
}

// 4. Route using the correct middleware
class WorkingRoute extends XerusRoute {
  method = Method.GET;
  path = "/working";

  onMount() {
    this.use(mwCorrect);
  }

  async handle(c: HTTPContext) {
    c.json({ message: "This works!" });
  }
}

// Mount the class blueprints
app.mount(BrokenRoute, WorkingRoute);

console.log("🚀 Safeguard example running on http://localhost:8080");
console.log("Visit /broken to trigger the developer error safeguard.");
await app.listen(8080);