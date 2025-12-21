import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { Middleware } from "../src/Middleware";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// 1. Timing middleware to show execution flow
const timing = new Middleware(async (c: HTTPContext, next) => {
  console.log(">> [Middleware] Before handler");
  
  try {
    await next();
  } finally {
    // This runs even if an error occurs downstream
    console.log(">> [Middleware] After handler (cleanup)");
  }
});

// 2. Define the failing route as a class
class AsyncFailRoute extends XerusRoute {
  method = Method.GET;
  path = "/fail";

  onMount() {
    this.use(timing);
  }

  async handle(c: HTTPContext) {
    // Simulate async work
    await new Promise((r) => setTimeout(r, 50));
    
    console.log(">> [Handler] About to throw...");
    throw new Error("Async failure 💥");
  }
}

// 3. Optional: Define a global error handler to see the result
app.onErr(async (c, err) => {
  console.log(">> [Global Error Handler] Caught:", err.message);
  c.setStatus(500).json({ error: err.message });
});

// 4. Mount the class blueprint
app.mount(AsyncFailRoute);

console.log("🚀 Async Error example running on http://localhost:8080/fail");
await app.listen(8080);