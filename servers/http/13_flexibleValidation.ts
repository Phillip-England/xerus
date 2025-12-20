import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";

// --- Validations ---

class SecretHeader implements TypeValidator {
  val: string;
  constructor(d: any) { this.val = d["X-Secret"]; } // Case-insensitive fetch, specific key map
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
  app.get("/flex/header", async (c) => {
    c.json({ status: "ok" });
  }, Validator(SecretHeader, Source.HEADER("X-Secret")));

  // Param Target
  app.get("/flex/param/:id", async (c) => {
    const p = c.getValid(IdParam);
    c.json({ id: p.id });
  }, Validator(IdParam, Source.PARAM("id")));

  // Specific Query Target
  app.get("/flex/query", async (c) => {
    const q = c.getValid(PageQuery);
    c.json({ page: q.page });
  }, Validator(PageQuery, Source.QUERY("page")));

}