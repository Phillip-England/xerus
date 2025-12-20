import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
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
      originalError: e.message
    });
  }
});

export function middlewareErrors(app: Xerus) {
  // 1. Route where middleware catches the error
  const catchMeRoute = new Route("GET", "/mw-err/catch-me", async (c: HTTPContext) => {
    throw new Error("I am an error thrown in the handler");
  });
  catchMeRoute.use(mwSafeGuard);
  app.mount(catchMeRoute);

  // 2. Route verifying standard bubbling still works (Control Test)
  app.mount(new Route("GET", "/mw-err/bubble-up", async (c: HTTPContext) => {
    throw new Error("I should bubble to global handler");
  }));
}