import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";

const app = new Xerus();

app.mount(
  new Route("GET", "/files/:id", async (c) => c.json({ match: "Param ID", id: c.getParam("id") })),
  new Route("GET", "/files/static", async (c) => c.json({ match: "Exact Static" })),
  new Route("GET", "/files/*", async (c) => c.json({ match: "Wildcard Catch-All", path: c.path })),
);

await app.listen(8080);
