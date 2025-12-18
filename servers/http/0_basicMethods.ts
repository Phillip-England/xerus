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
}