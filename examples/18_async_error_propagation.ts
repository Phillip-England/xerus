import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Middleware } from "../src/Middleware";

const app = new Xerus();

const timing = new Middleware(async (c, next) => {
  console.log("Before");
  await next();
  console.log("After");
});

app.mount(
  new Route("GET", "/fail", async () => {
    await new Promise((r) => setTimeout(r, 50));
    throw new Error("Async failure 💥");
  }).use(timing),
);

await app.listen(8080);
