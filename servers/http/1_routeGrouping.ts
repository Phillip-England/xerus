import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { mwGroupHeader } from "../middleware/mwGroupHeader";

export function routeGrouping(app: Xerus) {
  const api = app.group("/api");

  api.get("/v1", async (c: HTTPContext) => {
    c.json({ version: "v1" });
  });

  api.post("/echo", async (c: HTTPContext) => {
    const body = await c.parseBody(BodyType.JSON);
    c.json({ received: body });
  });

  const admin = app.group("/admin", mwGroupHeader);

  admin.get("/dashboard", async (c: HTTPContext) => {
    c.text("Welcome to the Dashboard");
  });

  admin.delete("/settings", async (c: HTTPContext) => {
    c.json({ deleted: true });
  });
}