// PATH: /home/jacex/src/xerus/servers/http/0_basicMethods.ts

import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import type { HTTPContext } from "../../src/HTTPContext";

export function basicMethods(app: Xerus) {
  app.mount(
    new Route("GET", "/", async (c: HTTPContext) => {
      c.json({ message: "Hello, world!" });
    }),

    new Route("POST", "/items", async (c: HTTPContext) => {
      const body = await c.req.json();
      c.setStatus(201).json({ message: "Item created", data: body });
    }),

    new Route("PUT", "/items/1", async (c: HTTPContext) => {
      const body = await c.req.json();
      c.json({ message: "Item 1 updated", data: body });
    }),

    new Route("DELETE", "/items/1", async (c: HTTPContext) => {
      c.json({ message: "Item 1 deleted" });
    }),

    // --- Redirect Tests ---

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

    // -----------------------------------------------------------------------
    // Extra Basic / HTTP semantics endpoints
    // -----------------------------------------------------------------------

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

    // ✅ Echo query params with correct null behavior
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
