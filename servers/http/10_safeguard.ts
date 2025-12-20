import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
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

export function safeguard(app: Xerus) {
  const failRoute = new Route("GET", "/safeguard/fail", async (c: HTTPContext) => {
    await new Promise(r => setTimeout(r, 10)); 
    c.json({ message: "Should not see this" });
  });
  failRoute.use(mwForgotAwait);
  app.mount(failRoute);

  const okRoute = new Route("GET", "/safeguard/ok", async (c: HTTPContext) => {
    c.json({ status: "ok" });
  });
  okRoute.use(mwStandard);
  app.mount(okRoute);
}