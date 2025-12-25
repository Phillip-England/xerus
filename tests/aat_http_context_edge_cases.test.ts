import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import { BodyType } from "../src/BodyType";
import { parseBody } from "../src/std/Body";
import { json, setHeader, text } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

describe("HTTPContext edge cases", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    class JsonThenText extends XerusRoute {
      method = Method.POST;
      path = "/ctx/reparse/json-then-text";
      async handle(c: HTTPContext) {
        const j = await parseBody(c, BodyType.JSON);
        const raw = await parseBody(c, BodyType.TEXT);
        json(c, { ok: true, json: j, raw });
      }
    }

    class JsonThenForm extends XerusRoute {
      method = Method.POST;
      path = "/ctx/reparse/json-then-form";
      async handle(c: HTTPContext) {
        await parseBody(c, BodyType.JSON);
        await parseBody(c, BodyType.FORM);
        json(c, { ok: false, shouldNot: "reach" });
      }
    }

    class FormThenJson extends XerusRoute {
      method = Method.POST;
      path = "/ctx/reparse/form-then-json";
      async handle(c: HTTPContext) {
        await parseBody(c, BodyType.FORM);
        await parseBody(c, BodyType.JSON);
        json(c, { ok: false, shouldNot: "reach" });
      }
    }

    class MultipartThenJson extends XerusRoute {
      method = Method.POST;
      path = "/ctx/reparse/multipart-then-json";
      async handle(c: HTTPContext) {
        await parseBody(c, BodyType.MULTIPART_FORM);
        await parseBody(c, BodyType.JSON);
        json(c, { ok: false, shouldNot: "reach" });
      }
    }

    class HeaderNewline extends XerusRoute {
      method = Method.GET;
      path = "/ctx/header/newline";
      async handle(c: HTTPContext) {
        setHeader(c, "X-Test", "ok\r\ninjected: true");
        text(c, "should not reach");
      }
    }

    app.mount(
      JsonThenText,
      JsonThenForm,
      FormThenJson,
      MultipartThenJson,
      HeaderNewline,
    );

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("JSON -> TEXT should return same raw payload", async () => {
    const payload = { a: 1, b: "two" };
    const res = await fetch(makeURL(port, "/ctx/reparse/json-then-text"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.ok).toBe(true);
    expect(j.json).toEqual(payload);
    expect(typeof j.raw).toBe("string");
    expect(j.raw).toBe(JSON.stringify(payload));
  });

  test("JSON -> FORM should be blocked", async () => {
    const res = await fetch(makeURL(port, "/ctx/reparse/json-then-form"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: 1 }),
    });

    const j = await res.json();
    expect(res.status).toBe(400);
    expect(j.error.code).toBe("BODY_PARSING_FAILED");
    expect(j.error.message).toContain("BODY_PARSING_FAILED");
  });

  test("FORM -> JSON should be blocked", async () => {
    const res = await fetch(makeURL(port, "/ctx/reparse/form-then-json"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "x=1&y=2",
    });

    const j = await res.json();
    expect(res.status).toBe(400);
    expect(j.error.code).toBe("BODY_PARSING_FAILED");
    expect(j.error.message).toContain("BODY_PARSING_FAILED");
  });

  test("MULTIPART -> JSON should be blocked", async () => {
    const fd = new FormData();
    fd.append("a", "1");

    const res = await fetch(makeURL(port, "/ctx/reparse/multipart-then-json"), {
      method: "POST",
      body: fd,
    });

    const j = await res.json();
    expect(res.status).toBe(400);
    expect(j.error.code).toBe("BODY_PARSING_FAILED");
    expect(j.error.message).toContain("BODY_PARSING_FAILED");
  });

  test("Header newline injection should throw 500 INTERNAL_SERVER_ERROR", async () => {
    const res = await fetch(makeURL(port, "/ctx/header/newline"));
    const j = await res.json();

    expect(res.status).toBe(500);
    expect(j.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(j.error.message).toBe("Internal Server Error");
    expect(j.error.detail).toContain("Attempted to set invalid header");
  });
});
