import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { mwErrorTrigger } from "../middleware/mwErrorTrigger";

class StandardErr extends XerusRoute {
  method = Method.GET;
  path = "/err/standard";
  async handle(_c: HTTPContext) {
    throw new Error("Standard Route Failure");
  }
}

class MwErr extends XerusRoute {
  method = Method.GET;
  path = "/err/middleware";
  onMount() {
    this.use(mwErrorTrigger);
  }
  async handle(_c: HTTPContext) {
    _c.text("This won't be reached");
  }
}

class MissingFile extends XerusRoute {
  method = Method.GET;
  path = "/err/file-missing";
  async handle(c: HTTPContext) {
    return await c.file("./non/existent/path/file.txt");
  }
}

export function errorHandling(app: Xerus) {
  app.onErr(async (c: HTTPContext, err: any) => {
    const detail = err instanceof Error
      ? err.message
      : String(err ?? "Unknown Error");
    c.setStatus(500).json({
      error: {
        code: "GLOBAL_ERROR",
        message: "Custom Global Handler",
        detail,
      },
    });
  });

  app.mount(StandardErr, MwErr, MissingFile);
}
