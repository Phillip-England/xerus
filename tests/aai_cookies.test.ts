import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import { reqCookie } from "../src/std/Request";
import { setCookie, clearCookie, json } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

describe("Cookies", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    class SetCookieRoute extends XerusRoute {
      method = Method.GET;
      path = "/cookies/set";
      async handle(c: HTTPContext) {
        setCookie(c, "theme", "dark", { path: "/", httpOnly: true });
        json(c, { message: "Cookie set" });
      }
    }

    class SetComplexCookie extends XerusRoute {
      method = Method.GET;
      path = "/cookies/set-complex";
      async handle(c: HTTPContext) {
        setCookie(c, "session_id", "12345", {
          httpOnly: true,
          secure: true,
          sameSite: "Strict",
          maxAge: 3600,
        });
        setCookie(c, "preferences", "compact", { path: "/admin" });
        json(c, { message: "Complex cookies set" });
      }
    }

    class GetCookie extends XerusRoute {
      method = Method.GET;
      path = "/cookies/get";
      async handle(c: HTTPContext) {
        const theme = reqCookie(c, "theme");
        json(c, { theme });
      }
    }

    class ClearCookie extends XerusRoute {
      method = Method.GET;
      path = "/cookies/clear";
      async handle(c: HTTPContext) {
        clearCookie(c, "theme");
        json(c, { message: "Cookie cleared" });
      }
    }

    app.mount(
      SetCookieRoute,
      SetComplexCookie,
      GetCookie,
      ClearCookie,
    );

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("GET /cookies/set should return Set-Cookie header", async () => {
    const res = await fetch(makeURL(port, "/cookies/set"));
    const setCookieHeader = res.headers.get("Set-Cookie");
    expect(res.status).toBe(200);
    expect(setCookieHeader).toContain("theme=dark");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("Path=/");
  });

  test("GET /cookies/set-complex should set multiple distinct headers", async () => {
    const res = await fetch(makeURL(port, "/cookies/set-complex"));
    const cookies = res.headers.getSetCookie();

    expect(cookies.length).toBe(2);

    expect(cookies[0]).toContain("session_id=12345");
    expect(cookies[0]).toContain("Secure");
    expect(cookies[0]).toContain("SameSite=Strict");
    expect(cookies[0]).toContain("Max-Age=3600");

    expect(cookies[1]).toContain("preferences=compact");
    expect(cookies[1]).toContain("Path=/admin");
  });

  test("GET /cookies/get should parse incoming Cookie header", async () => {
    const res = await fetch(makeURL(port, "/cookies/get"), {
      headers: {
        Cookie: "theme=light; other=value",
      },
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.theme).toBe("light");
  });

  test("GET /cookies/get should return undefined for missing cookie", async () => {
    const res = await fetch(makeURL(port, "/cookies/get"));
    const data = await res.json();
    expect(data.theme).toBeUndefined();
  });

  test("GET /cookies/clear should set expiration in the past", async () => {
    const res = await fetch(makeURL(port, "/cookies/clear"));
    const setCookieHeader = res.headers.get("Set-Cookie");
    expect(setCookieHeader).toContain("theme=");
    expect(setCookieHeader).toContain("Max-Age=0");
    expect(setCookieHeader).toContain(
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    );
  });
});
