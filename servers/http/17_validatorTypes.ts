import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";

// --- 1. Query Params Validator ---
export class SearchQuery implements TypeValidator {
  term: string;
  limit: number;

  constructor(raw: any) {
    this.term = raw.q || "";
    this.limit = Number(raw.limit || "10");
  }

  async validate(c: HTTPContext) {
    if (this.term.length < 3) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Query 'q' must be 3+ chars");
    }
    if (this.limit < 1 || this.limit > 100) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Limit must be 1-100");
    }
  }
}

// --- 2. Path Params Validator ---
export class ProductIdParam implements TypeValidator {
  id: number;

  constructor(raw: any) {
    // Source.PARAM("id") returns a string
    this.id = Number(raw);
  }

  async validate(c: HTTPContext) {
    if (!Number.isInteger(this.id) || this.id <= 0) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "ID must be a positive integer");
    }
  }
}

// --- 3. JSON Body Validator ---
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

// --- 4. Form Body Validator ---
export class LoginForm implements TypeValidator {
  user: string;
  pass: string;

  constructor(raw: any) {
    this.user = raw.username;
    this.pass = raw.password;
  }

  async validate(c: HTTPContext) {
    if (!this.user || !this.pass) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Missing credentials");
    }
  }
}

// --- 5. Custom Data Validator (e.g. Headers) ---
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

// --- Routes ---

class QueryRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/query";
  validators = [Validator.from(Source.QUERY(), SearchQuery)];

  async handle(c: HTTPContext) {
    const q = c.resolve(SearchQuery);
    c.json({ term: q.term, limit: q.limit });
  }
}

class PathRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/product/:id";
  // Validate specific param key "id"
  validators = [Validator.from(Source.PARAM("id"), ProductIdParam)];

  async handle(c: HTTPContext) {
    const p = c.resolve(ProductIdParam);
    c.json({ productId: p.id });
  }
}

class JsonRoute extends XerusRoute {
  method = Method.POST;
  path = "/vtypes/json";
  validators = [Validator.from(Source.JSON(), CreateUserBody)];

  async handle(c: HTTPContext) {
    const b = c.resolve(CreateUserBody);
    c.json({ user: b.username, email: b.email });
  }
}

class FormRoute extends XerusRoute {
  method = Method.POST;
  path = "/vtypes/form";
  validators = [Validator.from(Source.FORM(), LoginForm)];

  async handle(c: HTTPContext) {
    const f = c.resolve(LoginForm);
    c.json({ login: f.user });
  }
}

class CustomRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/custom";
  
  // Custom provider function extracts the header
  validators = [
    Validator.from(Source.CUSTOM((c) => c.getHeader("X-Api-Key")), ApiKeyValidator)
  ];

  async handle(c: HTTPContext) {
    const k = c.resolve(ApiKeyValidator);
    c.json({ authorized: true, key: k.key });
  }
}

export function validatorTypes(app: Xerus) {
  app.mount(QueryRoute, PathRoute, JsonRoute, FormRoute, CustomRoute);
}