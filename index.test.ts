import { expect, test } from "bun:test";

import { Xerus, XerusContext } from ".";

test("server", () => {
  const app: Xerus = new Xerus();

  app.get("/", async (c: XerusContext) => {
    c.text("hello, world");
  });

  app.run(8080);
});
