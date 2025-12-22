import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Validator } from "../../src/Validator";
import type { TypeValidator } from "../../src/TypeValidator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";

export class QueryPageValidator implements TypeValidator {
  page!: number;
  async validate(c: HTTPContext) {
    this.page = Number(c.query("page") || "1");
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
    c.json({ page: this.query.page });
  }
}

export function validatorPattern(app: Xerus) {
  app.mount(ValidatorRoute);
}