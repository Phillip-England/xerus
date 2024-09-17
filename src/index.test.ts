import { expect, test } from "bun:test";

import { logger, Xerus, XerusContext } from ".";
import { sleep } from "bun";

function server(routeSetup: (app: Xerus) => void, testFn: Function) {
  const app: Xerus = new Xerus();
  routeSetup(app);
  app.run(8080);
  testFn();
}

test("hello", async () => {
  server(
    (app) => {
      app.get("/", async (c: XerusContext) => {
        c.text("hello, world");
      });
    },
    async () => {
      let res = await fetch("localhost:8080/");
      let text = await res.text();
      expect(text).toBe("hello, world");
    },
  );
});
