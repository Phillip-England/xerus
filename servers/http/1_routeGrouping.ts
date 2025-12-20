import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { mwGroupHeader } from "../middleware/mwGroupHeader";

export function routeGrouping(app: Xerus) {
  const api = app.group("/api");

  api.mount(new Route("GET", "/v1", async (c: HTTPContext) => {
    c.json({ version: "v1" });
  }));

  api.mount(new Route("POST", "/echo", async (c: HTTPContext) => {
    const body = await c.parseBody(BodyType.JSON);
    c.json({ received: body });
  }));

  const admin = app.group("/admin", mwGroupHeader);

  admin.mount(new Route("GET", "/dashboard", async (c: HTTPContext) => {
    c.text("Welcome to the Dashboard");
  }));

  admin.mount(new Route("DELETE", "/settings", async (c: HTTPContext) => {
    c.json({ deleted: true });
  }));
}