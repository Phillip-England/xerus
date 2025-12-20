import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";

const app = new Xerus();

app.mount(
  new Route("GET", "/user/:id", async (c) => {
    const userId = c.getParam("id");
    c.json({ userId });
  }),

  new Route("GET", "/post/:year/:month", async (c) => {
    const { year, month } = c.params;
    c.json({ year, month });
  }),

  new Route("GET", "/search", async (c) => {
    const query = c.query("q");
    const limit = c.query("limit", "10");
    c.json({ search_term: query, results_limit: limit });
  }),
);

await app.listen(8080);
