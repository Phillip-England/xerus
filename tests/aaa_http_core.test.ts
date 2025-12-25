import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import { BodyType } from "../src/BodyType";
import { json, text, setCookie, setStatus, setHeader, redirect } from "../src/std/Response";
import { parseBody, jsonBody, formBody, textBody } from "../src/std/Body";
import { reqCookie, query, param } from "../src/std/Request";

describe("HTTP Core Features", () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    const app = new Xerus();

    // --- Routes Definition ---
    class Root extends XerusRoute {
      method = Method.GET;
      path = "/";
      async handle(c: HTTPContext) { json(c, { message: "Hello, world!" }); }
    }

    class EchoQuery extends XerusRoute {
      method = Method.GET;
      path = "/echo-query";
      async handle(c: HTTPContext) {
        json(c, { a: query(c, "a"), b: query(c, "b") });
      }
    }

    class ParseJson extends XerusRoute {
      method = Method.POST;
      path = "/body/json";
      async handle(c: HTTPContext) {
        const data = await jsonBody(c);
        json(c, { data });
      }
    }

    class CookieSet extends XerusRoute {
      method = Method.GET;
      path = "/cookies/set";
      async handle(c: HTTPContext) {
        setCookie(c, "theme", "dark", { path: "/", httpOnly: true });
        json(c, { ok: true });
      }
    }

    class CookieGet extends XerusRoute {
      method = Method.GET;
      path = "/cookies/get";
      async handle(c: HTTPContext) {
        json(c, { theme: reqCookie(c, "theme") });
      }
    }

    class DynamicRoute extends XerusRoute {
      method = Method.GET;
      path = "/users/:id";
      async handle(c: HTTPContext) {
        json(c, { id: param(c, "id") });
      }
    }

    // --- Mount & Listen ---
    app.mount(Root, EchoQuery, ParseJson, CookieSet, CookieGet, DynamicRoute);
    
    // Listen on port 0 (random available port)
    server = await app.listen(0);
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop(true);
  });

  // --- Tests ---

  test("GET / should return Hello, world!", async () => {
    const res = await fetch(`${baseUrl}/`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.message).toBe("Hello, world!");
  });

  test("Query Params Echo", async () => {
    const res = await fetch(`${baseUrl}/echo-query?a=1&b=2`);
    const data = await res.json();
    expect(data.a).toBe("1");
    expect(data.b).toBe("2");
  });

  test("Body Parsing: JSON", async () => {
    const payload = { foo: "bar" };
    const res = await fetch(`${baseUrl}/body/json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    expect(data.data).toEqual(payload);
  });

  test("Cookies: Set and Get", async () => {
    // Test Set
    const resSet = await fetch(`${baseUrl}/cookies/set`);
    const setCookieHeader = resSet.headers.get("Set-Cookie") || "";
    expect(setCookieHeader).toContain("theme=dark");

    // Test Get
    const resGet = await fetch(`${baseUrl}/cookies/get`, {
      headers: { "Cookie": "theme=light" }
    });
    const data = await resGet.json();
    expect(data.theme).toBe("light");
  });

  test("Routing: Dynamic Params", async () => {
    const res = await fetch(`${baseUrl}/users/99`);
    const data = await res.json();
    expect(data.id).toBe("99");
  });
});