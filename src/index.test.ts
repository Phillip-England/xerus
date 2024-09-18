import { expect, test } from "bun:test";

import { logger, timeout, Xerus, XerusContext } from ".";
import { sleep } from "bun";

test("hello world", async () => {
  const app: Xerus = new Xerus();
  app.get("/", async (c: XerusContext) => {
    c.text("hello, world");
  });
  await app.run(8080);
  let res = await fetch("localhost:8080/");
  let text = await res.text();
  expect(text).toBe("hello, world");
});

test("timeout", async () => {
  const app: Xerus = new Xerus();
  app.setTimeoutDuration(1000);
  app.use("*", timeout);
  app.get("/slow", async (c: XerusContext) => {
    await sleep(3000);
    c.text("This will never be reached due to timeout");
  });
  await app.run(8080);
  const res = await fetch("http://localhost:8080/slow");
  const text = await res.text();
  expect(res.status).toBe(504);
  expect(text).toBe(JSON.stringify({ error: "request timed out" }));
});
