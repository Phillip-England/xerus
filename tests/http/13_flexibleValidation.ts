import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import type { TypeValidator } from "../../src/TypeValidator";
import { header, param, query } from "../../src/std/Request";
import { json } from "../../src/std/Response";
import { Validator } from "../../src/Validator";

class HeaderValidator implements TypeValidator {
  val!: string;
  async validate(c: HTTPContext) {
    this.val = header(c, "X-Secret") ?? "";
    if (this.val !== "xerus-power") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid Secret");
    }
  }
}

class IdParamValidator implements TypeValidator {
  id!: number;
  async validate(c: HTTPContext) {
    this.id = Number(param(c, "id"));
    z.number().int().parse(this.id);
  }
}

class PageQueryValidator implements TypeValidator {
  page!: number;
  async validate(c: HTTPContext) {
    this.page = Number(query(c, "page"));
    z.number().min(1).parse(this.page);
  }
}

class HeaderRoute extends XerusRoute {
  method = Method.GET;
  path = "/flex/header";
  secret = Validator.Ctx(HeaderValidator);
  async handle(c: HTTPContext) {
    json(c, { status: "ok" });
  }
}

class ParamRoute extends XerusRoute {
  method = Method.GET;
  path = "/flex/param/:id";
  params = Validator.Ctx(IdParamValidator);
  async handle(c: HTTPContext) {
    json(c, { id: this.params.id });
  }
}

class QueryRoute extends XerusRoute {
  method = Method.GET;
  path = "/flex/query";
  query = Validator.Ctx(PageQueryValidator);
  async handle(c: HTTPContext) {
    json(c, { page: this.query.page });
  }
}

export function flexibleValidation(app: Xerus) {
  app.mount(HeaderRoute, ParamRoute, QueryRoute);
}