import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Middleware } from "../../src/Middleware";

// A middleware that specifically tests the "try/catch around next()" pattern
const mwSafeGuard = new Middleware(async (c: HTTPContext, next) => {
  try {
    await next();
  } catch (e: any) {
    c.setStatus(422);
    c.json({
      safeGuard: true,
      originalError: e.message,
    });
  }
});

// 1. Route where middleware catches the error
class CatchMeRoute extends XerusRoute {
  method = Method.GET;
  path = "/mw-err/catch-me";

  onMount() {
    this.use(mwSafeGuard);
  }

  async handle(c: HTTPContext) {
    throw new Error("I am an error thrown in the handler");
  }
}

// 2. Route verifying standard bubbling still works (Control Test)
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
