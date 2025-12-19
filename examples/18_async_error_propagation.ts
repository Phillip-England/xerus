import { Xerus } from "../src/Xerus";
import { Middleware } from "../src/Middleware";

const app = new Xerus();

const timing = new Middleware(async (c, next) => {
  console.log("Before");
  await next(); // error propagates back here
  console.log("After");
});

app.get(
  "/fail",
  async () => {
    await new Promise((r) => setTimeout(r, 50));
    throw new Error("Async failure 💥");
  },
  timing,
);

await app.listen(8080);
