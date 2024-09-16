import { expect, test } from "bun:test";

import { Xerus, XerusContext } from ".";

test("server", async () => {
  const app: Xerus = new Xerus();

  app.get("/", async (c: XerusContext) => {
    c.text("hello, world");
  });

  await app.run(8080);

  let res = await fetch("localhost:8080/");
  let text = await res.text();
  expect(text, "hello, world");
});
