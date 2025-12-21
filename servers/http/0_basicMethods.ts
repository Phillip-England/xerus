import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import type { HTTPContext } from "../../src/HTTPContext";
import { Source } from "../../src/ValidationSource";

export function basicMethods(app: Xerus) {
  app.mount(
    new Route("GET", "/", async (c: HTTPContext) => {
      c.json({ message: "Hello, world!" });
    }),

    new Route("POST", "/items", async (c: HTTPContext, data) => {
      const body = data.get<any>("body");
      c.setStatus(201).json({ message: "Item created", data: body });
    }).validate(Source.JSON(), "body", async (_c, v) => {
      v.isObject("Expected JSON object body");
      return v.value;
    }),

    new Route("PUT", "/items/1", async (c: HTTPContext, data) => {
      const body = data.get<any>("body");
      c.json({ message: "Item 1 updated", data: body });
    }).validate(Source.JSON(), "body", async (_c, v) => {
      v.isObject("Expected JSON object body");
      return v.value;
    }),

    new Route("DELETE", "/items/1", async (c: HTTPContext) => {
      c.json({ message: "Item 1 deleted" });
    }),

    new Route("GET", "/redir/simple", async (c: HTTPContext) => {
      c.redirect("/");
    }),

    new Route("GET", "/redir/query", async (c: HTTPContext) => {
      c.redirect("/?existing=1", { new: "2" });
    }),

    new Route("GET", "/redir/unsafe", async (c: HTTPContext) => {
      const dangerous = "Hack\r\nLocation: google.com";
      c.redirect("/", { msg: dangerous });
    }),

    new Route("GET", "/basics/ping", async (c: HTTPContext) => {
      c.setHeader("X-Ping", "pong");
      c.text("pong");
    }),

    new Route("HEAD", "/basics/ping", async (c: HTTPContext) => {
      c.setHeader("X-Ping", "pong");
      c.setStatus(200).text("");
    }),

    new Route("OPTIONS", "/basics/ping", async (c: HTTPContext) => {
      c.setHeader("Allow", "GET, HEAD, OPTIONS");
      c.setStatus(204).text("");
    }),

    // NOTE: These echo endpoints intentionally keep the existing behavior
    // (null for missing values) and do not force validation.
    new Route("GET", "/basics/echo-query", async (c: HTTPContext) => {
      const a = c.url.searchParams.get("a"); // string | null
      const b = c.url.searchParams.get("b"); // string | null
      c.json({ a, b });
    }),

    new Route("GET", "/basics/echo-header", async (c: HTTPContext) => {
      const v = c.req.headers.get("x-test-header") ?? "";
      c.setHeader("X-Echo-Test", v);
      c.json({ value: v });
    }),

    new Route("GET", "/basics/status", async (c: HTTPContext) => {
      c.setStatus(418).text("teapot");
    }),

    new Route("GET", "/basics/json", async (c: HTTPContext) => {
      c.json({ ok: true, msg: "✨ unicode ok" });
    }),
  );
}
