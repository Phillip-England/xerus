import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import { json, setCookie, clearCookie } from "../../src/std/Response";
import { reqCookie } from "../../src/std/Request";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}
async function readJSON(res: Response) {
  return await res.json();
}

describe("cookies: safe decode + default Set-Cookie attributes + clear semantics", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    class CookieEchoRoute extends XerusRoute {
      method = Method.GET;
      path = "/cookie/echo";
      async handle(c: HTTPContext) {
        const a = reqCookie(c, "a"); // decoded
        const bad = reqCookie(c, "bad"); // invalid percent encoding must not throw
        json(c, { a, bad });
      }
    }

    class CookieSetDefaultsRoute extends XerusRoute {
      method = Method.GET;
      path = "/cookie/set-defaults";
      async handle(c: HTTPContext) {
        // CookieJar default: Path=/, HttpOnly=true, SameSite=Lax
        setCookie(c, "sess", "hello world");
        json(c, { ok: true });
      }
    }

    class CookieClearRoute extends XerusRoute {
      method = Method.GET;
      path = "/cookie/clear";
      async handle(c: HTTPContext) {
        clearCookie(c, "sess");
        json(c, { ok: true });
      }
    }

    app.mount(CookieEchoRoute, CookieSetDefaultsRoute, CookieClearRoute);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Request cookie parsing safely decodes and tolerates invalid encoding", async () => {
    const res = await fetch(makeURL(port, "/cookie/echo"), {
      headers: {
        Cookie: "a=hello%20world; bad=%E0%A4%A", // invalid
      },
    });
    expect(res.status).toBe(200);
    const body = await readJSON(res);
    expect(body.a).toBe("hello world");
    // invalid decode should fall back to raw string
    expect(typeof body.bad).toBe("string");
    expect(body.bad.length).toBeGreaterThan(0);
  });

  test("Set-Cookie uses default Path=/, HttpOnly, SameSite=Lax and encodes value", async () => {
    const res = await fetch(makeURL(port, "/cookie/set-defaults"));
    expect(res.status).toBe(200);

    const setCookieLines = res.headers.getSetCookie?.() ?? [];
    // Bun’s Headers may not support getSetCookie in older builds; fallback:
    const raw = res.headers.get("set-cookie");
    const all = setCookieLines.length ? setCookieLines : raw ? [raw] : [];

    expect(all.length).toBeGreaterThan(0);
    const line = all[0];

    // value should be URL-encoded (space -> %20)
    expect(line).toContain("sess=hello%20world");
    expect(line).toContain("Path=/");
    expect(line).toContain("HttpOnly");
    expect(line).toContain("SameSite=Lax");
  });

  test("clearCookie sets Max-Age=0 and Expires=Date(0)", async () => {
    const res = await fetch(makeURL(port, "/cookie/clear"));
    expect(res.status).toBe(200);

    const setCookieLines = res.headers.getSetCookie?.() ?? [];
    const raw = res.headers.get("set-cookie");
    const all = setCookieLines.length ? setCookieLines : raw ? [raw] : [];

    expect(all.length).toBeGreaterThan(0);
    const line = all[0];

    expect(line).toContain("sess=");
    expect(line).toContain("Max-Age=0");
    expect(line).toContain("Expires=");
    // the epoch date in GMT; we won't hard-match full string to avoid locale quirks,
    // but Date(0) always includes "1970"
    expect(line).toContain("1970");
  });
});
