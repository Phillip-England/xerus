import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";
import { Middleware } from "../../src/Middleware";

// The Bad Middleware: Forgets to await next()
const mwForgotAwait = new Middleware(async (c: HTTPContext, next) => {
  // Firing the promise but NOT awaiting it causes the function to return
  // while the next() chain is still pending. 
  next(); 
});

// The Good Middleware
const mwStandard = new Middleware(async (c: HTTPContext, next) => {
  await next();
});

export function safeguard(app: Xerus) {
  app.get("/safeguard/fail", async (c: HTTPContext) => {
    // This handler simulates work. 
    // Because the middleware didn't await, the safeguard logic in HTTPHandler
    // sees that the middleware returned while next() was still pending.
    await new Promise(r => setTimeout(r, 10)); 
    c.json({ message: "Should not see this" });
  }, mwForgotAwait);

  app.get("/safeguard/ok", async (c: HTTPContext) => {
    c.json({ status: "ok" });
  }, mwStandard);
}