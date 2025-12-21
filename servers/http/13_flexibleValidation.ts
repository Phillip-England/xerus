import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { SystemErr } from "../../src/SystemErr"; // Import this
import { SystemErrCode } from "../../src/SystemErrCode"; // Import this

class HeaderRoute extends XerusRoute {
  method = Method.GET;
  path = "/flex/header";
  async validate(c: HTTPContext) {
    const val = c.getHeader("X-Secret");
    if (val !== "xerus-power") {
        // Throw specific error to get 400
        throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid Secret");
    }
  }
  async handle(c: HTTPContext) {
    c.json({ status: "ok" });
  }
}

// ... (Rest of file remains the same)
class ParamRoute extends XerusRoute {
  method = Method.GET;
  path = "/flex/param/:id";
  id!: number;
  async validate(c: HTTPContext) {
    const raw = c.getParam("id");
    const n = Number(raw);
    z.number().int().parse(n);
    this.id = n;
  }
  async handle(c: HTTPContext) {
    c.json({ id: this.id });
  }
}

class QueryRoute extends XerusRoute {
  method = Method.GET;
  path = "/flex/query";
  page!: number;
  async validate(c: HTTPContext) {
    const raw = c.query("page");
    const n = Number(raw);
    z.number().min(1).parse(n);
    this.page = n;
  }
  async handle(c: HTTPContext) {
    c.json({ page: this.page });
  }
}

export function flexibleValidation(app: Xerus) {
  app.mount(HeaderRoute, ParamRoute, QueryRoute);
}