import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";

// --- Validations ---

class SecretHeader implements TypeValidator {
  val: string;
  constructor(d: any) { this.val = d["X-Secret"]; } 
  validate() { if (this.val !== "xerus-power") throw new Error("Invalid Secret"); }
}

class IdParam implements TypeValidator {
  id: number;
  constructor(d: any) { this.id = Number(d.id); }
  validate() { z.object({ id: z.number().int() }).parse(this); }
}

class PageQuery implements TypeValidator {
  page: number;
  constructor(d: any) { this.page = Number(d.page); }
  validate() { z.object({ page: z.number().min(1) }).parse(this); }
}

export function flexibleValidation(app: Xerus) {
  
  // Header Target
  const headerRoute = new Route("GET", "/flex/header", async (c) => {
    c.json({ status: "ok" });
  });
  headerRoute.use(Validator(SecretHeader, Source.HEADER("X-Secret")));
  app.mount(headerRoute);

  // Param Target
  const paramRoute = new Route("GET", "/flex/param/:id", async (c) => {
    const p = c.getValid(IdParam);
    c.json({ id: p.id });
  });
  paramRoute.use(Validator(IdParam, Source.PARAM("id")));
  app.mount(paramRoute);

  // Specific Query Target
  const queryRoute = new Route("GET", "/flex/query", async (c) => {
    const q = c.getValid(PageQuery);
    c.json({ page: q.page });
  });
  queryRoute.use(Validator(PageQuery, Source.QUERY("page")));
  app.mount(queryRoute);

}