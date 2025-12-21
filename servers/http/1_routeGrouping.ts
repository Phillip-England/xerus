import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";
import { mwGroupHeader } from "../middleware/mwGroupHeader";
import { Source } from "../../src/ValidationSource";
import { Validator } from "../../src/Validator";

class JsonBody {
  raw: any;
  constructor(raw: any) {
    this.raw = raw;
  }
  validate() {
    new Validator(this.raw).isObject("Expected JSON object body");
  }
}

export function routeGrouping(app: Xerus) {
  app.mount(
    new Route("GET", "/api/v1", async (c: HTTPContext) => {
      c.json({ version: "v1" });
    }),

    new Route("POST", "/api/echo", async (c: HTTPContext, data) => {
      const body = data.get(JsonBody).raw;
      c.json({ received: body });
    }).validate(Source.JSON(), JsonBody),

    new Route("GET", "/admin/dashboard", async (c: HTTPContext) => {
      c.text("Welcome to the Dashboard");
    }).use(mwGroupHeader),

    new Route("DELETE", "/admin/settings", async (c: HTTPContext) => {
      c.json({ deleted: true });
    }).use(mwGroupHeader),
  );
}
