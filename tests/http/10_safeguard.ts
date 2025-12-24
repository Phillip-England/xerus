import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Inject, type ServiceLifecycle } from "../../src/RouteFields";

class ErrorCatcherService implements ServiceLifecycle {
  async onError(c: HTTPContext, err: any) {
    c.setStatus(500).json({
      error: {
        code: "SERVICE_CAUGHT",
        message: "Service caught the error",
        detail: err.message
      }
    });
  }
}

class FailRoute extends XerusRoute {
  method = Method.GET;
  path = "/safeguard/fail";
  // REFACTORED
  inject = [Inject(ErrorCatcherService)];

  async handle(c: HTTPContext) {
    throw new Error("Handler Failed");
  }
}

class OkRoute extends XerusRoute {
  method = Method.GET;
  path = "/safeguard/ok";
  async handle(c: HTTPContext) {
    c.json({ status: "ok" });
  }
}

export function safeguard(app: Xerus) {
  app.mount(FailRoute, OkRoute);
}