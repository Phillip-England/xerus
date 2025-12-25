import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import { BodyType } from "../src/BodyType";
import { url } from "../src/std/Request";
import { json } from "../src/std/Response";
import { parseBody } from "../src/std/Body";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

/* ======================
   Routes
====================== */

class QueryArray extends XerusRoute {
  method = Method.GET;
  path = "/integrity/query-array";

  async handle(c: HTTPContext) {
    const all = url(c).searchParams.getAll("id");
    json(c, { ids: all });
  }
}

class FormMulti extends XerusRoute {
  method = Method.POST;
  path = "/integrity/form-multi";

  async handle(c: HTTPContext) {
    const data = await parseBody(c, BodyType.FORM, { formMode: "multi" });
    json(c, { data });
  }
}

class EmptyJson extends XerusRoute {
  method = Method.POST;
  path = "/integrity/empty-json";

  async handle(c: HTTPContext) {
    try {
      const data = await parseBody(c, BodyType.JSON);
      json(c, { empty: false, data });
    } catch (e: any) {
      json(c, { empty: true, error: e.message });
    }
  }
}

/* ======================
   Tests
====================== */

describe("Data Integrity", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();
    app.mount(QueryArray, FormMulti, EmptyJson);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Integrity: Query should capture multiple values for same key", async () => {
    const res = await fetch(makeURL(port, "/integrity/query-array?id=1&id=2&id=3"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ids).toEqual(["1", "2", "3"]);
  });

  test("Integrity: Form should parse multiple values when formMode='multi'", async () => {
    const res = await fetch(makeURL(port, "/integrity/form-multi"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "tag=a&tag=b&user=me",
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.tag).toEqual(["a", "b"]);
    expect(json.data.user).toBe("me");
  });

  test("Integrity: Empty body parsed as JSON should trigger error handling", async () => {
    const res = await fetch(makeURL(port, "/integrity/empty-json"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
    });

    const json = await res.json();

    expect(json.empty).toBe(true);
    expect(json.error).toContain("JSON");
  });
});
