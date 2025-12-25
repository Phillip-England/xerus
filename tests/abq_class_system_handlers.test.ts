import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import type { ServiceLifecycle } from "../src/RouteFields";
import type { XerusValidator } from "../src/XerusValidator";
import { json, setHeader } from "../src/std/Response";
import { query } from "../src/std/Request";

function makeURL(port: number, path: string) {
 return `http://127.0.0.1:${port}${path}`;
}

describe("Class-based System Handlers (onNotFound / onErr)", () => {
 let server: any;
 let port: number;

 beforeAll(async () => {
  const app = new Xerus();

  // 1. Define a Service to prove Dependency Injection works in system routes
  class SystemAuditService implements ServiceLifecycle {
   async before(c: HTTPContext) {
    setHeader(c, "X-System-Audit", "Logged");
   }
  }

  // 2. Define a Validator to prove Validation works in system routes
  class QueryTagValidator implements XerusValidator<{ tag: string }> {
   async validate(c: HTTPContext) {
    const tag = query(c, "tag") || "none";
    return { tag };
   }
  }

  // 3. Define the Class-based Not Found Handler
  class CustomNotFoundHandler extends XerusRoute {
   // Method/Path are ignored by system handlers but required by abstract class
   method = Method.GET; 
   path = "";

   // Inject Service and Validator
   services = [SystemAuditService];
   validators = [QueryTagValidator];

   async handle(c: HTTPContext) {
    const { tag } = c.validated(QueryTagValidator);
    json(c, { 
      error: "Resource Not Found", 
      tag,
      isClass: true 
    }, 404);
   }
  }

  // 4. Define the Class-based Error Handler
  class CustomErrorHandler extends XerusRoute {
   method = Method.GET;
   path = "";
   
   services = [SystemAuditService];

   async handle(c: HTTPContext) {
    // Verify we can access the error that was thrown via c.err
    const errorMsg = c.err instanceof Error ? c.err.message : String(c.err);
    
    json(c, { 
      error: "Internal Error", 
      details: errorMsg,
      handledByClass: true
    }, 500);
   }
  }

  // 5. Route that throws an error to trigger onErr
  class ThrowingRoute extends XerusRoute {
   method = Method.GET;
   path = "/trigger-error";
   async handle(_c: HTTPContext) {
    throw new Error("Intentional Crash");
   }
  }

  // Mount the system handlers using the new Class API
  app.onNotFound(CustomNotFoundHandler);
  app.onErr(CustomErrorHandler);
  
  app.mount(ThrowingRoute);

  server = await app.listen(0);
  port = server.port;
 });

 afterAll(() => {
  server?.stop?.(true);
 });

 test("onNotFound (Class): Should execute handle(), run Services, and run Validators", async () => {
  // Request a non-existent route with a query param
  const res = await fetch(makeURL(port, "/does-not-exist?tag=testing"));
  const data = await res.json();

  expect(res.status).toBe(404);
  
  // Check Handler Logic
  expect(data.error).toBe("Resource Not Found");
  expect(data.isClass).toBe(true);

  // Check Validator Logic
  expect(data.tag).toBe("testing");

  // Check Service Logic (Middleware hook)
  expect(res.headers.get("X-System-Audit")).toBe("Logged");
 });

 test("onErr (Class): Should capture c.err, run Services, and return custom response", async () => {
  // Request the route that throws
  const res = await fetch(makeURL(port, "/trigger-error"));
  const data = await res.json();

  expect(res.status).toBe(500);

  // Check Error capturing
  expect(data.error).toBe("Internal Error");
  expect(data.details).toBe("Intentional Crash");
  expect(data.handledByClass).toBe(true);

  // Check Service Logic (Middleware hook) within error handler
  expect(res.headers.get("X-System-Audit")).toBe("Logged");
 });
});