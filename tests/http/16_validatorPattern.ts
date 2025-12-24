import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import type { TypeValidator } from "../../src/TypeValidator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import { query } from "../../src/std/Request";
import { json } from "../../src/std/Response";

export class QueryPageValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    const page = Number(query(c, "page") || "1");
    if (isNaN(page) || page < 1) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Page must be >= 1");
    }
    return { page };
  }
}

class ValidatorRoute extends XerusRoute {
  method = Method.GET;
  path = "/validator/pattern";
  validators = [QueryPageValidator];

  async handle(c: HTTPContext) {
    const { page } = c.validated(QueryPageValidator);
    json(c, { page });
  }
}

export function validatorPattern(app: Xerus) {
  app.mount(ValidatorRoute);
}
