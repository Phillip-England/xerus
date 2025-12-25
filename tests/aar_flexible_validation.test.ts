import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { z } from "zod";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import { SystemErr } from "../src/SystemErr";
import { SystemErrCode } from "../src/SystemErrCode";
import type { TypeValidator } from "../src/TypeValidator";
import { header, param, query } from "../src/std/Request";
import { json } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

// --- Validators

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

// --- Routes

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

describe("Flexible validation (header / param / query)", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();
    app.mount(HeaderRoute, ParamRoute, QueryRoute);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Flexible: HEADER validation should pass with correct key", async () => {
    const res = await fetch(makeURL(port, "/flex/header"), {
      headers: { "X-Secret": "xerus-power" },
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
  });

  test("Flexible: HEADER validation should fail with wrong key", async () => {
    const res = await fetch(makeURL(port, "/flex/header"), {
      headers: { "X-Secret": "wrong" },
    });
    expect(res.status).toBe(400);
  });

  test("Flexible: PARAM validation should parse and validate numeric ID", async () => {
    const res = await fetch(makeURL(port, "/flex/param/123"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.id).toBe(123);
  });

  test("Flexible: PARAM validation should fail non-numeric ID", async () => {
    const res = await fetch(makeURL(port, "/flex/param/abc"));
    expect(res.status).toBe(400);
  });

  test("Flexible: QUERY key validation should pass valid number", async () => {
    const res = await fetch(makeURL(port, "/flex/query?page=5"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.page).toBe(5);
  });

  test("Flexible: QUERY key validation should fail invalid number", async () => {
    const res = await fetch(makeURL(port, "/flex/query?page=0"));
    expect(res.status).toBe(400);
  });
});
