import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { Source } from "../../src/ValidationSource";

export function flexibleValidation(app: Xerus) {
  const headerRoute = new Route("GET", "/flex/header", async (c) => {
    c.json({ status: "ok" });
  }).validate(Source.HEADER("X-Secret"), async (_c, v) => {
    // Source.HEADER("X-Secret") will store under the inferred key: "X-Secret"
    // If your Source.HEADER implementation normalizes keys, data.get(...) should match that.
    const raw = String(v.value ?? "");
    if (raw !== "xerus-power") throw new Error("Invalid Secret");
    // keep as string
    v.set(raw);
  });

  const paramRoute = new Route("GET", "/flex/param/:id", async (c, data) => {
    const id = data.get<number>("id");
    c.json({ id });
  }).validate(Source.PARAM("id"), async (_c, v) => {
    const n = Number(v.value);
    z.number().int().parse(n);
    v.set(n);
  });

  const queryRoute = new Route("GET", "/flex/query", async (c, data) => {
    const page = data.get<number>("page");
    c.json({ page });
  }).validate(Source.QUERY("page"), async (_c, v) => {
    const n = Number(v.value);
    z.number().min(1).parse(n);
    v.set(n);
  });

  app.mount(headerRoute, paramRoute, queryRoute);
}
