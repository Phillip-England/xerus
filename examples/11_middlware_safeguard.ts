import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Middleware } from "../src/Middleware";
import type { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

const mwBroken = new Middleware(async (c: HTTPContext, next) => {
  console.log(">> Middleware starting...");
  next(); // ❌ floating promise
  console.log(">> Middleware finished (too early!)");
});

const mwCorrect = new Middleware(async (c: HTTPContext, next) => {
  console.log(">> Middleware starting...");
  await next();
  console.log(">> Middleware finished (correctly)");
});

app.mount(
  new Route("GET", "/broken", async (c) => {
    await new Promise((r) => setTimeout(r, 50));
    c.json({ message: "You should not see this because safeguard catches it." });
  }).use(mwBroken),

  new Route("GET", "/working", async (c) => {
    c.json({ message: "This works!" });
  }).use(mwCorrect),
);

await app.listen(8080);
