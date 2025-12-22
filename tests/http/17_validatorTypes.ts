import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";

export class SearchQuery implements TypeValidator {
  term: string;
  limit: number;
  constructor(raw: any) {
    this.term = raw.q || "";
    this.limit = Number(raw.limit || "10");
  }
  async validate(c: HTTPContext) {
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
  id: number;
  constructor(raw: any) {
    this.id = Number(raw);
  }
  async validate(c: HTTPContext) {
    if (!Number.isInteger(this.id) || this.id <= 0) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "ID must be a positive integer",
      );
    }
  }
}

export class CreateUserBody implements TypeValidator {
  username: string;
  email: string;
  constructor(raw: any) {
    this.username = raw.username;
    this.email = raw.email;
  }
  async validate(c: HTTPContext) {
    if (!this.username || this.username.length < 3) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid username");
    }
    if (!this.email || !this.email.includes("@")) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid email");
    }
  }
}

export class LoginForm implements TypeValidator {
  user: string;
  pass: string;
  constructor(raw: any) {
    this.user = raw.username;
    this.pass = raw.password;
  }
  async validate(c: HTTPContext) {
    if (!this.user || !this.pass) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Missing credentials",
      );
    }
  }
}

export class ApiKeyValidator implements TypeValidator {
  key: string;
  constructor(raw: any) {
    this.key = raw;
  }
  async validate(c: HTTPContext) {
    if (this.key !== "secret-123") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid API Key");
    }
  }
}

// --- UPDATED ROUTES USING PROPERTIES ---

class QueryRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/query";

  query = Validator.Param(Source.QUERY(), SearchQuery);

  async handle(c: HTTPContext) {
    c.json({ term: this.query.term, limit: this.query.limit });
  }
}

class PathRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/product/:id";

  prod = Validator.Param(Source.PARAM("id"), ProductIdParam);

  async handle(c: HTTPContext) {
    c.json({ productId: this.prod.id });
  }
}

class JsonRoute extends XerusRoute {
  method = Method.POST;
  path = "/vtypes/json";

  body = Validator.Param(Source.JSON(), CreateUserBody);

  async handle(c: HTTPContext) {
    c.json({ user: this.body.username, email: this.body.email });
  }
}

class FormRoute extends XerusRoute {
  method = Method.POST;
  path = "/vtypes/form";

  form = Validator.Param(Source.FORM(), LoginForm);

  async handle(c: HTTPContext) {
    c.json({ login: this.form.user });
  }
}

class CustomRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/custom";

  auth = Validator.Param(
    Source.CUSTOM((c) => c.getHeader("X-Api-Key")),
    ApiKeyValidator,
  );

  async handle(c: HTTPContext) {
    c.json({ authorized: true, key: this.auth.key });
  }
}

export function validatorTypes(app: Xerus) {
  app.mount(QueryRoute, PathRoute, JsonRoute, FormRoute, CustomRoute);
}
