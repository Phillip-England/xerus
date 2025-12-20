import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";

// --- Validations ---

class SecretHeader implements TypeValidator {
  val: string;
  constructor(d: any) {
    this.val = d["X-Secret"];
  }
  validate() {
    if (this.val !== "xerus-power") throw new Error("Invalid Secret");
  }
}

class IdParam implements TypeValidator {
  id: number;
  constructor(d: any) {
    this.id = Number(d.id);
  }
  validate() {
    z.object({ id: z.number().int() }).parse(this);
  }
}

class PageQuery implements TypeValidator {
  page: number;
  constructor(d: any) {
    this.page = Number(d.page);
  }
  validate() {
    z.object({ page: z.number().min(1) }).parse(this);
  }
}

export function flexibleValidation(app: Xerus) {
  const headerRoute = new Route("GET", "/flex/header", async (c) => {
    c.json({ status: "ok" });
  }).validate(SecretHeader, Source.HEADER("X-Secret"));

  const paramRoute = new Route("GET", "/flex/param/:id", async (c, data) => {
    const p = data.get(IdParam);
    c.json({ id: p.id });
  }).validate(IdParam, Source.PARAM("id"));

  const queryRoute = new Route("GET", "/flex/query", async (c, data) => {
    const q = data.get(PageQuery);
    c.json({ page: q.page });
  }).validate(PageQuery, Source.QUERY("page"));

  app.mount(headerRoute, paramRoute, queryRoute);
}
