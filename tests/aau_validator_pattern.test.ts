import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import type { XerusValidator } from "../src/XerusValidator";
import { SystemErr } from "../src/SystemErr";
import { SystemErrCode } from "../src/SystemErrCode";
import { query } from "../src/std/Request";
import { json } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

// --------------------
// Validator
// --------------------

class QueryPageValidator implements XerusValidator {
  async validate(c: HTTPContext) {
    const page = Number(query(c, "page") || "1");
    if (isNaN(page) || page < 1) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Page must be >= 1");
    }
    return { page };
  }
}

// --------------------
// Route
// --------------------

class ValidatorRoute extends XerusRoute {
  method = Method.GET;
  path = "/validator/pattern";
  validators = [QueryPageValidator];

  async handle(c: HTTPContext) {
    const { page } = c.validated(QueryPageValidator);
    json(c, { page });
  }
}

describe("Validator pattern", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();
    app.mount(ValidatorRoute);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Validator Pattern: Should resolve valid data using c.resolve()", async () => {
    const res = await fetch(makeURL(port, "/validator/pattern?page=5"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.page).toBe(5);
  });

  test("Validator Pattern: Should fail validation logic", async () => {
    const res = await fetch(makeURL(port, "/validator/pattern?page=0"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_FAILED");
    expect(data.error.detail).toBe("VALIDATION_FAILED: Page must be >= 1");
  });

  test("Validator Pattern: Should use default value if missing", async () => {
    const res = await fetch(makeURL(port, "/validator/pattern"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.page).toBe(1);
  });
});
