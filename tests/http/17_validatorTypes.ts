import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import type { TypeValidator } from "../../src/TypeValidator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import { header, param, query } from "../../src/std/Request";
import { parseBody } from "../../src/std/Body";
import { json } from "../../src/std/Response";
import { Validator } from "../../src/Validator";

export class SearchQuery implements TypeValidator {
  term!: string;
  limit!: number;
  async validate(c: HTTPContext) {
    this.term = query(c, "q") || "";
    this.limit = Number(query(c, "limit") || "10");
    if (this.term.length < 3) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Query 'q' must be 3+ chars",
      );
    }
    if (this.limit < 1 || this.limit > 100) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Limit must be 1-100",
      );
    }
  }
}

export class ProductIdParam implements TypeValidator {
  id!: number;
  async validate(c: HTTPContext) {
    this.id = Number(param(c, "id"));
    if (!Number.isInteger(this.id) || this.id <= 0) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "ID must be a positive integer",
      );
    }
  }
}

export class CreateUserBody implements TypeValidator {
  username!: string;
  email!: string;
  async validate(c: HTTPContext) {
    const raw: any = await parseBody(c, BodyType.JSON);
    this.username = raw.username;
    this.email = raw.email;
    if (!this.username || this.username.length < 3) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid username");
    }
    if (!this.email || !this.email.includes("@")) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid email");
    }
  }
}

export class LoginForm implements TypeValidator {
  user!: string;
  pass!: string;
  async validate(c: HTTPContext) {
    const raw: any = await parseBody(c, BodyType.FORM);
    this.user = raw.username;
    this.pass = raw.password;
    if (!this.user || !this.pass) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Missing credentials",
      );
    }
  }
}

export class ApiKeyValidator implements TypeValidator {
  key!: string;
  async validate(c: HTTPContext) {
    this.key = header(c, "X-Api-Key") ?? "";
    if (this.key !== "secret-123") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid API Key");
    }
  }
}

class QueryRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/query";
  query = Validator.Ctx(SearchQuery);
  async handle(c: HTTPContext) {
    json(c, { term: this.query.term, limit: this.query.limit });
  }
}

class PathRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/product/:id";
  prod = Validator.Ctx(ProductIdParam);
  async handle(c: HTTPContext) {
    json(c, { productId: this.prod.id });
  }
}

class JsonRoute extends XerusRoute {
  method = Method.POST;
  path = "/vtypes/json";
  body = Validator.Ctx(CreateUserBody);
  async handle(c: HTTPContext) {
    json(c, { user: this.body.username, email: this.body.email });
  }
}

class FormRoute extends XerusRoute {
  method = Method.POST;
  path = "/vtypes/form";
  form = Validator.Ctx(LoginForm);
  async handle(c: HTTPContext) {
    json(c, { login: this.form.user });
  }
}

class CustomRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/custom";
  auth = Validator.Ctx(ApiKeyValidator);
  async handle(c: HTTPContext) {
    json(c, { authorized: true, key: this.auth.key });
  }
}

export function validatorTypes(app: Xerus) {
  app.mount(QueryRoute, PathRoute, JsonRoute, FormRoute, CustomRoute);
}