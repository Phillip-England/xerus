import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

class UserRoute extends XerusRoute {
  method = Method.GET;
  path = "/user/:id";

  async handle(c: HTTPContext) {
    const userId = c.getParam("id");
    c.json({ userId });
  }
}

class PostRoute extends XerusRoute {
  method = Method.GET;
  path = "/post/:year/:month";

  async handle(c: HTTPContext) {
    // Accessing multiple params via c.params
    const { year, month } = c.params;
    c.json({ year, month });
  }
}

class SearchRoute extends XerusRoute {
  method = Method.GET;
  path = "/search";

  async handle(c: HTTPContext) {
    // Accessing search query strings
    const query = c.query("q");
    const limit = c.query("limit", "10"); // with default value
    c.json({ search_term: query, results_limit: limit });
  }
}

// Mount the class blueprints
app.mount(UserRoute, PostRoute, SearchRoute);

console.log("🚀 Params and Query example running on http://localhost:8080");
await app.listen(8080);