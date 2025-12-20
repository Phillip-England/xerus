import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";
import { mwErrorTrigger } from "../middleware/mwErrorTrigger";

export function errorHandling(app: Xerus) {
  // Global Error Handler
  app.onErr(async (c: HTTPContext, err: any) => {
    const message = err instanceof Error ? err.message : "Unknown Error";
    return c.setStatus(500).json({ error: "Custom Global Handler", detail: message });
  });

  app.mount(
    new Route("GET", "/err/standard", async (c: HTTPContext) => {
      throw new Error("Standard Route Failure");
    })
  );

  const mwErrorRoute = new Route("GET", "/err/middleware", async (c: HTTPContext) => {
    return c.text("This won't be reached");
  });
  mwErrorRoute.use(mwErrorTrigger);
  app.mount(mwErrorRoute);

  // Added this specifically for 6_errorHandling.test.ts
  app.mount(new Route("GET", "/err/file-missing", async (c: HTTPContext) => {
    return await c.file("./non/existent/path/file.txt");
  }));
}