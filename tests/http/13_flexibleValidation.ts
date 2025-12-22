import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";

class HeaderValidator implements TypeValidator {
  val: string;
  constructor(raw: any) {
    this.val = raw ?? "";
  }
  async validate(c: HTTPContext) {
    if (this.val !== "xerus-power") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid Secret");
    }
  }
}

class IdParamValidator implements TypeValidator {
  id: number;
  constructor(raw: any) {
    this.id = Number(raw);
  }
  async validate(c: HTTPContext) {
    z.number().int().parse(this.id);
  }
}

class PageQueryValidator implements TypeValidator {
  page: number;
  constructor(raw: any) {
    this.page = Number(raw);
  }
  async validate(c: HTTPContext) {
    z.number().min(1).parse(this.page);
  }
}

class HeaderRoute extends XerusRoute {
  method = Method.GET;
  path = "/flex/header";

  secret = Validator.Param(
    Source.CUSTOM((c) => c.getHeader("X-Secret")),
    HeaderValidator,
  );

  async handle(c: HTTPContext) {
    c.json({ status: "ok" });
  }
}

class ParamRoute extends XerusRoute {
  method = Method.GET;
  path = "/flex/param/:id";

  params = Validator.Param(Source.PARAM("id"), IdParamValidator);

  async handle(c: HTTPContext) {
    c.json({ id: this.params.id });
  }
}

class QueryRoute extends XerusRoute {
  method = Method.GET;
  path = "/flex/query";

  query = Validator.Param(Source.QUERY("page"), PageQueryValidator);

  async handle(c: HTTPContext) {
    c.json({ page: this.query.page });
  }
}

export function flexibleValidation(app: Xerus) {
  app.mount(HeaderRoute, ParamRoute, QueryRoute);
}
