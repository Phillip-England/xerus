import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";
import { mwGroupHeader } from "../middleware/mwGroupHeader";
import { Source } from "../../src/ValidationSource";

export function routeGrouping(app: Xerus) {
  app.mount(
    new Route("GET", "/api/v1", async (c: HTTPContext) => {
      c.json({ version: "v1" });
    }),

    new Route("POST", "/api/echo", async (c: HTTPContext, data) => {
      const body = data.get<any>("body");
      c.json({ received: body });
    }).validate(Source.JSON(), "body", async (_c, v) => {
      v.isObject("Expected JSON object body");
      return v.value;
    }),

    new Route("GET", "/admin/dashboard", async (c: HTTPContext) => {
      c.text("Welcome to the Dashboard");
    }).use(mwGroupHeader),

    new Route("DELETE", "/admin/settings", async (c: HTTPContext) => {
      c.json({ deleted: true });
    }).use(mwGroupHeader),
  );
}
