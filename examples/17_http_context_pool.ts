import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";

const app = new Xerus();
app.setHTTPContextPool(500);

app.mount(
  new Route("GET", "/", async (c) => {
    c.text("Optimized with HTTPContext pooling 🚀");
  }),
);

await app.listen(8080);
