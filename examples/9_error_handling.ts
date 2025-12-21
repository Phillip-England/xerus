import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import { SystemErr } from "../src/SystemErr";
import { SystemErrCode } from "../src/SystemErrCode";

const app = new Xerus();

// 1. Global 404 Handler
app.onNotFound(async (c: HTTPContext) => {
  c.setStatus(404).json({ 
    error: "Resource Not Found", 
    path: c.path 
  });
});

// 2. Global Error Handler
// Note: This now receives the context and the error object directly
app.onErr(async (c: HTTPContext, err: any) => {
  console.error("Critical Failure:", err);
  
  c.setStatus(500).json({
    error: "Internal Server Error",
    details: err instanceof Error ? err.message : "Unknown",
  });
});

// 3. Route that throws a standard Error
class BrokenRoute extends XerusRoute {
  method = Method.GET;
  path = "/broken";

  async handle(c: HTTPContext) {
    throw new Error("Something went wrong in the database!");
  }
}

// 4. Route that throws a SystemErr
class MissingRoute extends XerusRoute {
  method = Method.GET;
  path = "/missing";

  async handle(c: HTTPContext) {
    // SystemErr will trigger specific logic in your framework
    throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, "Config file missing");
  }
}

// Mount the class blueprints
app.mount(BrokenRoute, MissingRoute);

console.log("🚀 Error handling example running on http://localhost:8080");
await app.listen(8080);