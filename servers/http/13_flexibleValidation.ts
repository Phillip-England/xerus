import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { Source } from "../../src/ValidationSource";
import { Validator } from "../../src/Validator";

class SecretHeader {
  value: string;
  constructor(raw: any) {
    this.value = String(raw ?? "");
  }
  validate() {
    if (this.value !== "xerus-power") throw new Error("Invalid Secret");
  }
}

class NumericIdParam {
  id: number;
  constructor(raw: any) {
    this.id = raw as any;
  }
  validate() {
    const n = Number(this.id);
    z.number().int().parse(n);
    this.id = n;
  }
}

class PageQuery {
  page: number;
  constructor(raw: any) {
    this.page = raw as any;
  }
  validate() {
    // accept string -> number
    const n = Number(this.page);
    z.number().min(1).parse(n);
    this.page = n;
  }
}

export function flexibleValidation(app: Xerus) {
  const headerRoute = new Route("GET", "/flex/header", async (c, data) => {
    data.get(SecretHeader);
    c.json({ status: "ok" });
  }).validate(Source.HEADER("X-Secret"), SecretHeader);

  const paramRoute = new Route("GET", "/flex/param/:id", async (c, data) => {
    const id = data.get(NumericIdParam).id;
    c.json({ id });
  }).validate(Source.PARAM("id"), NumericIdParam);

  const queryRoute = new Route("GET", "/flex/query", async (c, data) => {
    const page = data.get(PageQuery).page;
    c.json({ page });
  }).validate(Source.QUERY("page"), PageQuery);

  app.mount(headerRoute, paramRoute, queryRoute);
}
