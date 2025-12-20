// PATH: /home/jacex/src/xerus/servers/http/1_routeGrouping.ts

import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { mwGroupHeader } from "../middleware/mwGroupHeader";
import { Middleware } from "../../src/Middleware";

export function routeGrouping(app: Xerus) {
  // Previously: app.group("/api")
  // Now: explicit, independent Route objects with explicit paths.

  app.mount(
    new Route("GET", "/api/v1", async (c: HTTPContext) => {
      c.json({ version: "v1" });
    }),

    new Route("POST", "/api/echo", async (c: HTTPContext) => {
      const body = await c.parseBody(BodyType.JSON);
      c.json({ received: body });
    }),

    // Previously: group middleware on "/admin"
    // Now: attach middleware to each route that needs it.
    new Route("GET", "/admin/dashboard", async (c: HTTPContext) => {
      c.text("Welcome to the Dashboard");
    }).use(mwGroupHeader),

    new Route("DELETE", "/admin/settings", async (c: HTTPContext) => {
      c.json({ deleted: true });
    }).use(mwGroupHeader),
  );
}
