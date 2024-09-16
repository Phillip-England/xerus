import { expect, test } from "bun:test";

import { logger, Xerus, XerusContext } from ".";
import { sleep } from "bun";

test("server", async () => {
  const app: Xerus = new Xerus();

  app.use("*", logger);

  app.get("/", async (c: XerusContext) => {
    c.text("hello, world");
  });

  await app.run(8080);

  let res = await fetch("localhost:8080/");
  let text = await res.text();

  expect(text, "hello, world");
});
