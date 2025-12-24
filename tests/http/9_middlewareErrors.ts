import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Inject, type ServiceLifecycle } from "../../src/RouteFields";
import { json, setStatus } from "../../src/std/Response";

class ServiceSafeGuard implements ServiceLifecycle {
  async onError(c: HTTPContext, err: any) {
    setStatus(c, 422);
    json(c, {
      safeGuard: true,
      originalError: err.message,
    });
  }
}

class CatchMeRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw-err/catch-me";
  inject = [Inject(ServiceSafeGuard)];
  async handle(c: HTTPContext) {
    throw new Error("I am an error thrown in the handler");
  }
}

class BubbleUpRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw-err/bubble-up";
  async handle(c: HTTPContext) {
    throw new Error("I should bubble to global handler");
  }
}

export function middlewareErrors(app: Xerus) {
  app.mount(CatchMeRoute, BubbleUpRoute);
}