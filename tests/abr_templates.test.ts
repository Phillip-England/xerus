// --- START FILE: tests/templates.test.ts ---
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import { template } from "../src/std/Template";

describe("Templates", () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    const app = new Xerus();

    // Register embedded templates (keys match your embedDir() output shape: "/rel/path")
    app.templates({
      "/index.html": { content: "<h1>Hello</h1>", type: "text/html" },
      "/nested/page.html": { content: "<p>Nested</p>", type: "text/html" },
    });

    class TIndexRoute extends XerusRoute {
      method = Method.GET;
      path = "/t/index";
      async handle(c: HTTPContext) {
        const html = template(c, "index.html"); // also works with "./index.html" or "/index.html"
        c.res.headers.set("Content-Type", "text/html");
        c.res.body(html);
        c.finalize();
      }
    }

    class TNestedRoute extends XerusRoute {
      method = Method.GET;
      path = "/t/nested";
      async handle(c: HTTPContext) {
        const html = template(c, "nested/page.html");
        c.res.headers.set("Content-Type", "text/html");
        c.res.body(html);
        c.finalize();
      }
    }

    class TTraversalBlockedRoute extends XerusRoute {
      method = Method.GET;
      path = "/t/traversal";
      async handle(c: HTTPContext) {
        // Should throw FILE_NOT_FOUND / Access Denied via TemplateStore normalizeRel()
        const html = template(c, "../secrets.txt");
        c.res.headers.set("Content-Type", "text/plain");
        c.res.body(html);
        c.finalize();
      }
    }

    class TMissingRoute extends XerusRoute {
      method = Method.GET;
      path = "/t/missing";
      async handle(c: HTTPContext) {
        const html = template(c, "does-not-exist.html");
        c.res.headers.set("Content-Type", "text/plain");
        c.res.body(html);
        c.finalize();
      }
    }

    app.mount(TIndexRoute, TNestedRoute, TTraversalBlockedRoute, TMissingRoute);

    server = await app.listen(0);
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop(true);
  });

  test("template(): reads root template via relative path", async () => {
    const res = await fetch(`${baseUrl}/t/index`);
    const txt = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")?.toLowerCase()).toContain("text/html");
    expect(txt).toBe("<h1>Hello</h1>");
  });

  test("template(): reads nested template", async () => {
    const res = await fetch(`${baseUrl}/t/nested`);
    const txt = await res.text();
    expect(res.status).toBe(200);
    expect(txt).toBe("<p>Nested</p>");
  });

  test("template(): blocks path traversal", async () => {
    const res = await fetch(`${baseUrl}/t/traversal`);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body?.error?.code).toBe("FILE_NOT_FOUND");
  });

  test("template(): missing template returns FILE_NOT_FOUND", async () => {
    const res = await fetch(`${baseUrl}/t/missing`);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body?.error?.code).toBe("FILE_NOT_FOUND");
  });
});
// --- END FILE: tests/templates.test.ts ---
