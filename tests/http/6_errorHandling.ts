import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Inject, type ServiceLifecycle } from "../../src/RouteFields";

class ServiceErrorTrigger implements ServiceLifecycle {
  async before(c: HTTPContext) {
    throw new Error("Failure in Service");
  }
}

class StandardErr extends XerusRoute {
  method = Method.GET;
  path = "/err/standard";
  async handle(_c: HTTPContext) {
    throw new Error("Standard Route Failure");
  }
}

class SvcErr extends XerusRoute {
  method = Method.GET;
  path = "/err/middleware"; 
  // REFACTORED
  inject = [Inject(ServiceErrorTrigger)];

  async handle(_c: HTTPContext) {
    _c.text("This won't be reached");
  }
}

class MissingFile extends XerusRoute {
  method = Method.GET;
  path = "/err/file-missing";
  async handle(c: HTTPContext) {
    return await c.file("./non/existent/path/file.txt");
  }
}

export function errorHandling(app: Xerus) {
  app.onErr(async (c: HTTPContext, err: any) => {
    const detail = err instanceof Error
      ? err.message
      : String(err ?? "Unknown Error");
    
    // Check if error came from service
    const msg = detail === "Failure in Service" ? "Failure in Middleware" : "Custom Global Handler";

    c.setStatus(500).json({
      error: {
        code: "GLOBAL_ERROR",
        message: msg, 
        detail,
      },
    });
  });
  app.mount(StandardErr, SvcErr, MissingFile);
}