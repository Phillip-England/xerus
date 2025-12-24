import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import type { ServiceLifecycle } from "../../src/RouteFields";
import { json, setStatus } from "../../src/std/Response";

class ErrorCatcherService implements ServiceLifecycle {
  async onError(c: HTTPContext, err: any) {
    setStatus(c, 500);
    json(c, {
      error: {
        code: "SERVICE_CAUGHT",
        message: "Service caught the error",
        detail: err?.message ?? String(err),
      },
    });
  }
}

class FailRoute extends XerusRoute {
  method = Method.GET;
  path = "/safeguard/fail";
  services = [ErrorCatcherService];
  async handle(_c: HTTPContext) {
    throw new Error("Handler Failed");
  }
}

class OkRoute extends XerusRoute {
  method = Method.GET;
  path = "/safeguard/ok";
  async handle(c: HTTPContext) {
    json(c, { status: "ok" });
  }
}

export function safeguard(app: Xerus) {
  app.mount(FailRoute, OkRoute);
}
