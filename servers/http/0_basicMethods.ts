import { Xerus } from "../../src/Xerus";
import type { HTTPContext } from "../../src/HTTPContext";

export function basicMethods(app: Xerus) {
  app.get("/", async (c: HTTPContext) => {
    c.json({ message: "Hello, world!" });
  });

  app.post("/items", async (c: HTTPContext) => {
    const body = await c.req.json();
    c.setStatus(201).json({ message: "Item created", data: body });
  });

  app.put("/items/1", async (c: HTTPContext) => {
    const body = await c.req.json();
    c.json({ message: "Item 1 updated", data: body });
  });

  app.delete("/items/1", async (c: HTTPContext) => {
    c.json({ message: "Item 1 deleted" });
  });

  // --- Redirect Tests ---
  
  app.get("/redir/simple", async (c: HTTPContext) => {
    c.redirect("/");
  });

  app.get("/redir/query", async (c: HTTPContext) => {
    // Tests merging with existing query param
    c.redirect("/?existing=1", { new: "2" });
  });

  app.get("/redir/unsafe", async (c: HTTPContext) => {
    // This string would normally crash the server if set directly in headers
    const dangerous = "Hack\r\nLocation: google.com";
    c.redirect("/", { msg: dangerous });
  });
}