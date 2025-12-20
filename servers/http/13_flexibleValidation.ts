// PATH: /home/jacex/src/xerus/servers/http/13_flexibleValidation.ts

import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { Source } from "../../src/ValidationSource";

export function flexibleValidation(app: Xerus) {
  const headerRoute = new Route("GET", "/flex/header", async (c) => {
    c.json({ status: "ok" });
  }).validate(Source.HEADER("X-Secret"), "secret", async (_c, raw) => {
    if (raw !== "xerus-power") throw new Error("Invalid Secret");
    return raw;
  });

  const paramRoute = new Route("GET", "/flex/param/:id", async (c, data) => {
    const id = data.get<number>("id");
    c.json({ id });
  }).validate(Source.PARAM("id"), "id", async (_c, raw) => {
    const n = Number(raw);
    z.number().int().parse(n);
    return n;
  });

  const queryRoute = new Route("GET", "/flex/query", async (c, data) => {
    const page = data.get<number>("page");
    c.json({ page });
  }).validate(Source.QUERY("page"), "page", async (_c, raw) => {
    const n = Number(raw);
    z.number().min(1).parse(n);
    return n;
  });

  app.mount(headerRoute, paramRoute, queryRoute);
}
