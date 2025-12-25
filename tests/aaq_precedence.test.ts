import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import { json } from "../src/std/Response";
import { param } from "../src/std/Request";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

describe("Routing precedence", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    class ConflictStatic extends XerusRoute {
      method = Method.GET;
      path = "/conflict/static";
      async handle(c: HTTPContext) {
        json(c, { type: "exact" });
      }
    }

    class ConflictParam extends XerusRoute {
      method = Method.GET;
      path = "/conflict/:id";
      async handle(c: HTTPContext) {
        json(c, { type: "param", val: param(c, "id") });
      }
    }

    class FallbackExact extends XerusRoute {
      method = Method.GET;
      path = "/fallback/folder/valid";
      async handle(c: HTTPContext) {
        json(c, { type: "deep-exact" });
      }
    }

    class FallbackParam extends XerusRoute {
      method = Method.GET;
      path = "/fallback/:id/valid";
      async handle(c: HTTPContext) {
        json(c, { type: "deep-param", id: param(c, "id") });
      }
    }

    class WildA extends XerusRoute {
      method = Method.GET;
      path = "/wild/a";
      async handle(c: HTTPContext) {
        json(c, { type: "exact-a" });
      }
    }

    class WildAny extends XerusRoute {
      method = Method.GET;
      path = "/wild/*";
      async handle(c: HTTPContext) {
        json(c, { type: "wildcard" });
      }
    }

    class MixedParam extends XerusRoute {
      method = Method.GET;
      path = "/mixed/:id";
      async handle(c: HTTPContext) {
        json(c, { type: "param-mixed", id: param(c, "id") });
      }
    }

    app.mount(
      ConflictStatic,
      ConflictParam,
      FallbackExact,
      FallbackParam,
      WildA,
      WildAny,
      MixedParam,
    );

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Precedence: /conflict/static should hit exact match", async () => {
    const res = await fetch(makeURL(port, "/conflict/static"));
    const data = await res.json();
    expect(data.type).toBe("exact");
  });

  test("Precedence: /conflict/dynamic should hit param match", async () => {
    const res = await fetch(makeURL(port, "/conflict/dynamic"));
    const data = await res.json();
    expect(data.type).toBe("param");
    expect(data.val).toBe("dynamic");
  });

  test("Precedence: /fallback/folder/valid should match exact path", async () => {
    const res = await fetch(makeURL(port, "/fallback/folder/valid"));
    const data = await res.json();
    expect(data.type).toBe("deep-exact");
  });

  test("Precedence: /fallback/other/valid should match param path", async () => {
    const res = await fetch(makeURL(port, "/fallback/other/valid"));
    const data = await res.json();
    expect(data.type).toBe("deep-param");
    expect(data.id).toBe("other");
  });

  test("Precedence: Wildcard should capture non-matching paths", async () => {
    const res = await fetch(makeURL(port, "/wild/anything-else"));
    const data = await res.json();
    expect(data.type).toBe("wildcard");
  });

  test("Precedence: Exact should beat wildcard", async () => {
    const res = await fetch(makeURL(port, "/wild/a"));
    const data = await res.json();
    expect(data.type).toBe("exact-a");
  });

  test("Precedence: Param should handle fallback if exact not found", async () => {
    const res = await fetch(makeURL(port, "/mixed/static"));
    const data = await res.json();
    expect(data.type).toBe("param-mixed");
    expect(data.id).toBe("static");
  });
});
