import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";
import { Middleware } from "../../src/Middleware";

// A middleware that specifically tests the "try/catch around next()" pattern
const mwSafeGuard = new Middleware(async (c: HTTPContext, next) => {
  try {
    // This awaits the entire downstream chain (other middleware + handler)
    await next();
  } catch (e: any) {
    // Because we caught it here, it will NOT reach the global app.onErr
    c.setStatus(422); // Unprocessable Entity (Arbitrary choice for test)
    c.json({
      safeGuard: true,
      originalError: e.message
    });
  }
});

export function middlewareErrors(app: Xerus) {
  // 1. Route where middleware catches the error
  app.get(
    "/mw-err/catch-me", 
    async (c: HTTPContext) => {
      throw new Error("I am an error thrown in the handler");
    }, 
    mwSafeGuard
  );

  // 2. Route verifying standard bubbling still works (Control Test)
  app.get("/mw-err/bubble-up", async (c: HTTPContext) => {
    throw new Error("I should bubble to global handler");
  });
}