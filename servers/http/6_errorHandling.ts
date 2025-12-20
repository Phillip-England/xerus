// PATH: /home/jacex/src/xerus/servers/http/6_errorHandling.ts

import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";
import { mwErrorTrigger } from "../middleware/mwErrorTrigger";

export function errorHandling(app: Xerus) {
  // Global Error Handler
  // ✅ Now returns canonical envelope: { error: { code, message, detail } }
  // ✅ Keeps legacy test expectations:
  //    data.error === "Custom Global Handler"   -> now data.error.message
  //    data.detail === "<err message>"          -> now data.error.detail
  app.onErr(async (c: HTTPContext, err: any) => {
    const detail = err instanceof Error ? err.message : String(err ?? "Unknown Error");

    c.setStatus(500).json({
      error: {
        code: "GLOBAL_ERROR",
        message: "Custom Global Handler",
        detail,
      },
    });
  });

  app.mount(
    new Route("GET", "/err/standard", async (_c: HTTPContext) => {
      throw new Error("Standard Route Failure");
    }),
  );

  const mwErrorRoute = new Route("GET", "/err/middleware", async (_c: HTTPContext) => {
    // Should never reach; middleware throws.
    _c.text("This won't be reached");
  });
  mwErrorRoute.use(mwErrorTrigger);
  app.mount(mwErrorRoute);

  // Added this specifically for 6_errorHandling.test.ts
  app.mount(
    new Route("GET", "/err/file-missing", async (c: HTTPContext) => {
      return await c.file("./non/existent/path/file.txt");
    }),
  );
}
