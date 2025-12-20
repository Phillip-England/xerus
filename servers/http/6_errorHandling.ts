import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";
import { mwErrorTrigger } from "../middleware/mwErrorTrigger";

export function errorHandling(app: Xerus) {
  // Global Error Handler using new signature (c, err)
  app.onErr(async (c: HTTPContext, err: any) => {
    // You no longer need to call c.getErr(), it's passed directly!
    const message = err instanceof Error ? err.message : "Unknown Error";
    return c.setStatus(500).json({ error: "Custom Global Handler", detail: message });
  });

  app.get("/err/standard", async (c: HTTPContext) => {
    throw new Error("Standard Route Failure");
  });

  app.get("/err/middleware", async (c: HTTPContext) => {
    return c.text("This won't be reached");
  }, mwErrorTrigger);

  // Added this specifically for 6_errorHandling.test.ts
  app.get("/err/file-missing", async (c: HTTPContext) => {
    return await c.file("./non/existent/path/file.txt");
  });
}