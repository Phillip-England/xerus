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

export class SearchQuery implements TypeValidator {
  async validate(c: HTTPContext) {
    const term = query(c, "q") || "";
    const limit = Number(query(c, "limit") || "10");

    if (term.length < 3) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Query 'q' must be 3+ chars",
      );
    }
    if (limit < 1 || limit > 100) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Limit must be 1-100");
    }

    return { term, limit };
  }
}

export class ProductIdParam implements TypeValidator {
  async validate(c: HTTPContext) {
    const id = Number(param(c, "id"));
    if (!Number.isInteger(id) || id <= 0) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "ID must be a positive integer",
      );
    }
    return { id };
  }
}

export class CreateUserBody implements TypeValidator {
  async validate(c: HTTPContext) {
    const raw: any = await parseBody(c, BodyType.JSON);
    const username = raw?.username;
    const email = raw?.email;

    if (!username || username.length < 3) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid username");
    }
    if (!email || !String(email).includes("@")) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid email");
    }

    return { username, email };
  }
}

export class LoginForm implements TypeValidator {
  async validate(c: HTTPContext) {
    const raw: any = await parseBody(c, BodyType.FORM);
    const user = raw?.username;
    const pass = raw?.password;

    if (!user || !pass) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Missing credentials");
    }
    return { user, pass };
  }
}

export class ApiKeyValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    const key = header(c, "X-Api-Key") ?? "";
    if (key !== "secret-123") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid API Key");
    }
    return { key };
  }
}

class QueryRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/query";
  validators = [SearchQuery];

  async handle(c: HTTPContext) {
    const { term, limit } = c.validated(SearchQuery);
    json(c, { term, limit });
  }
}

class PathRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/product/:id";
  validators = [ProductIdParam];

  async handle(c: HTTPContext) {
    const { id } = c.validated(ProductIdParam);
    json(c, { productId: id });
  }
}

class JsonRoute extends XerusRoute {
  method = Method.POST;
  path = "/vtypes/json";
  validators = [CreateUserBody];

  async handle(c: HTTPContext) {
    const body = c.validated(CreateUserBody);
    json(c, { user: body.username, email: body.email });
  }
}

class FormRoute extends XerusRoute {
  method = Method.POST;
  path = "/vtypes/form";
  validators = [LoginForm];

  async handle(c: HTTPContext) {
    const form = c.validated(LoginForm);
    json(c, { login: form.user });
  }
}

class CustomRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/custom";
  validators = [ApiKeyValidator];

  async handle(c: HTTPContext) {
    c.validated(ApiKeyValidator);
    json(c, { authorized: true });
  }
}

export function validatorTypes(app: Xerus) {
  app.mount(QueryRoute, PathRoute, JsonRoute, FormRoute, CustomRoute);
}
