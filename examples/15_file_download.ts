import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";

const app = new Xerus();

app.mount(
  new Route("GET", "/download", async (c) => {
    await c.file("./README.md");
  }),
);

await app.listen(8080);
