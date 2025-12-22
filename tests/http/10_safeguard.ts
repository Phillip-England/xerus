import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Middleware } from "../../src/Middleware";

// The Bad Middleware: Forgets to await next()
const mwForgotAwait = new Middleware(async (c: HTTPContext, next) => {
  next();
});

// The Good Middleware
const mwStandard = new Middleware(async (c: HTTPContext, next) => {
  await next();
});

class FailRoute extends XerusRoute {
  method = Method.GET;
  path = "/safeguard/fail";

  onMount() {
    this.use(mwForgotAwait);
  }

  async handle(c: HTTPContext) {
    await new Promise((r) => setTimeout(r, 10));
    c.json({ message: "Should not see this" });
  }
}

class OkRoute extends XerusRoute {
  method = Method.GET;
  path = "/safeguard/ok";

  onMount() {
    this.use(mwStandard);
  }

  async handle(c: HTTPContext) {
    c.json({ status: "ok" });
  }
}

export function safeguard(app: Xerus) {
  app.mount(FailRoute, OkRoute);
}
