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
      // Tests merging with existing query param
      c.redirect("/?existing=1", { new: "2" });
    }),

    new Route("GET", "/redir/unsafe", async (c: HTTPContext) => {
      const dangerous = "Hack\r\nLocation: google.com";
      c.redirect("/", { msg: dangerous });
    })
  );
}