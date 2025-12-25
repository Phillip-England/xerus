import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import type { TypeValidator } from "../../src/XerusValidator";
import { header, param, query } from "../../src/std/Request";
import { json } from "../../src/std/Response";

class HeaderValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    const val = header(c, "X-Secret") ?? "";
    if (val !== "xerus-power") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid Secret");
    }
    return { val };
  }
}

class IdParamValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    const id = Number(param(c, "id"));
    z.number().int().parse(id);
    return { id };
  }
}

class PageQueryValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    const page = Number(query(c, "page"));
    z.number().min(1).parse(page);
    return { page };
  }
}

class HeaderRoute extends XerusRoute {
  method = Method.GET;
  path = "/flex/header";
  validators = [HeaderValidator];

  async handle(c: HTTPContext) {
    c.validated(HeaderValidator);
    json(c, { status: "ok" });
  }
}

class ParamRoute extends XerusRoute {
  method = Method.GET;
  path = "/flex/param/:id";
  validators = [IdParamValidator];

  async handle(c: HTTPContext) {
    const { id } = c.validated(IdParamValidator);
    json(c, { id });
  }
}

class QueryRoute extends XerusRoute {
  method = Method.GET;
  path = "/flex/query";
  validators = [PageQueryValidator];

  async handle(c: HTTPContext) {
    const { page } = c.validated(PageQueryValidator);
    json(c, { page });
  }
}

export function flexibleValidation(app: Xerus) {
  app.mount(HeaderRoute, ParamRoute, QueryRoute);
}
