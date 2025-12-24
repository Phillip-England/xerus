import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import type { ServiceLifecycle } from "../../src/RouteFields";
import { file, json, setStatus, text } from "../../src/std/Response";

class ServiceErrorTrigger implements ServiceLifecycle {
  async before(_c: HTTPContext) {
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
  services = [ServiceErrorTrigger];

  async handle(c: HTTPContext) {
    text(c, "This won't be reached");
  }
}

class MissingFile extends XerusRoute {
  method = Method.GET;
  path = "/err/file-missing";
  async handle(c: HTTPContext) {
    return await file(c, "./non/existent/path/file.txt");
  }
}

export function errorHandling(app: Xerus) {
  app.onErr(async (c: HTTPContext, err: any) => {
    const detail =
      err instanceof Error ? err.message : String(err ?? "Unknown Error");
    const msg =
      detail === "Failure in Service"
        ? "Failure in Middleware"
        : "Custom Global Handler";

    setStatus(c, 500);
    json(c, {
      error: {
        code: "GLOBAL_ERROR",
        message: msg,
        detail,
      },
    });
  });

  app.mount(StandardErr, SvcErr, MissingFile);
}
