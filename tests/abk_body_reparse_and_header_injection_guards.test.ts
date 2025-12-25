// PATH: /home/jacex/src/xerus/tests/http/27_bodyReparseAndHeaderInjectionGuards.test.ts
import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import { json, setHeader } from "../src/std/Response";
import { jsonBody, formBody, textBody } from "../src/std/Body";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

async function readJSON(res: Response) {
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (!ct.includes("application/json")) return { _text: await res.text() };
  return await res.json();
}

describe("body re-parse rules + header injection guards", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    class ParseJsonThenFormRoute extends XerusRoute {
      method = Method.POST;
      path = "/body/json-then-form";
      async handle(c: HTTPContext) {
        await jsonBody(c); // consumes/parses JSON
        await formBody(c);
        json(c, { ok: true });
      }
    }

    class ParseTextThenJsonRoute extends XerusRoute {
      method = Method.POST;
      path = "/body/text-then-json";
      async handle(c: HTTPContext) {
        const t = await textBody(c);
        const j = await jsonBody(c);
        json(c, { textLen: t.length, jsonType: typeof j });
      }
    }

    class HeaderNewlineGuardRoute extends XerusRoute {
      method = Method.GET;
      path = "/hdr/newline";
      async handle(c: HTTPContext) {
        setHeader(c, "X-Test", "ok\r\ninjected: yes");
        json(c, { ok: true });
      }
    }

    app.mount(ParseJsonThenFormRoute, ParseTextThenJsonRoute, HeaderNewlineGuardRoute);
    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("JSON -> FORM reparse is rejected with 400 BODY_PARSING_FAILED", async () => {
    const res = await fetch(makeURL(port, "/body/json-then-form"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });

    expect(res.status).toBe(400);
    const body = await readJSON(res);
    
    expect(body?.error?.code).toBe("BODY_PARSING_FAILED");
    // Updated expectation to match the actual SystemErr format or the specific re-parse message
    const msg = String(body?.error?.message ?? "");
    expect(msg).toContain("BODY_PARSING_FAILED");
    expect(msg).toContain("re-parsing as FORM is not allowed");
  });

  test("TEXT -> JSON is permitted (jsonBody parses from cached raw text)", async () => {
    const res = await fetch(makeURL(port, "/body/text-then-json"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });

    expect(res.status).toBe(200);
    const body = await readJSON(res);
    expect(body.textLen).toBeGreaterThan(0);
    expect(body.jsonType).toBe("object");
  });

  test("header injection guard rejects newline and returns 500 INTERNAL_SERVER_ERROR", async () => {
    const res = await fetch(makeURL(port, "/hdr/newline"));
    expect(res.status).toBe(500);

    const body = await readJSON(res);
    expect(body?.error?.code).toBe("INTERNAL_SERVER_ERROR");
    expect(String(body?.error?.detail ?? "")).toContain("Attempted to set invalid header");
  });
});