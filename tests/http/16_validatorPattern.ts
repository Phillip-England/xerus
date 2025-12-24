import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import type { TypeValidator } from "../../src/TypeValidator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import { query } from "../../src/std/Request";
import { json } from "../../src/std/Response";
import { Validator } from "../../src/Validator";

export class QueryPageValidator implements TypeValidator {
  page!: number;
  async validate(c: HTTPContext) {
    this.page = Number(query(c, "page") || "1");
    if (isNaN(this.page) || this.page < 1) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Page must be >= 1");
    }
  }
}

class ValidatorRoute extends XerusRoute {
  method = Method.GET;
  path = "/validator/pattern";
  query = Validator.Ctx(QueryPageValidator);
  async handle(c: HTTPContext) {
    json(c, { page: this.query.page });
  }
}

export function validatorPattern(app: Xerus) {
  app.mount(ValidatorRoute);
}