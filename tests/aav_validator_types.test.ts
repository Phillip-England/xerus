import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import { BodyType } from "../src/BodyType";
import type { TypeValidator } from "../src/TypeValidator";
import { SystemErr } from "../src/SystemErr";
import { SystemErrCode } from "../src/SystemErrCode";
import { header, param, query } from "../src/std/Request";
import { parseBody } from "../src/std/Body";
import { json } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

/* ======================
   Validators
====================== */

class SearchQuery implements TypeValidator {
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
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Limit must be 1-100",
      );
    }

    return { term, limit };
  }
}

class ProductIdParam implements TypeValidator {
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

class CreateUserBody implements TypeValidator {
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

class LoginForm implements TypeValidator {
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

class ApiKeyValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    const key = header(c, "X-Api-Key") ?? "";
    if (key !== "secret-123") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid API Key");
    }
    return { key };
  }
}

/* ======================
   Routes
====================== */

class QueryRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/query";
  validators = [SearchQuery];

  async handle(c: HTTPContext) {
    const { term } = c.validated(SearchQuery);
    json(c, { term });
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
    json(c, { user: body.username });
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

/* ======================
   Tests
====================== */

describe("Validator types", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();
    app.mount(
      QueryRoute,
      PathRoute,
      JsonRoute,
      FormRoute,
      CustomRoute,
    );

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Query validator success", async () => {
    const res = await fetch(makeURL(port, "/vtypes/query?q=bun&limit=5"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.term).toBe("bun");
  });

  test("Query validator failure", async () => {
    const res = await fetch(makeURL(port, "/vtypes/query?q=no"));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.detail).toContain("Query 'q' must be 3+ chars");
  });

  test("Path param validator success", async () => {
    const res = await fetch(makeURL(port, "/vtypes/product/99"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.productId).toBe(99);
  });

  test("JSON body validator success", async () => {
    const res = await fetch(makeURL(port, "/vtypes/json"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", email: "admin@test.com" }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.user).toBe("admin");
  });

  test("Form validator success", async () => {
    const res = await fetch(makeURL(port, "/vtypes/form"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "username=jdoe&password=123",
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.login).toBe("jdoe");
  });

  test("Custom validator failure", async () => {
    const res = await fetch(makeURL(port, "/vtypes/custom"), {
      headers: { "X-Api-Key": "wrong" },
    });
    expect(res.status).toBe(400);
  });
});
