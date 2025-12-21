import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// 1. Static Match (Highest Priority)
class StaticFileRoute extends XerusRoute {
  method = Method.GET;
  path = "/files/static";

  async handle(c: HTTPContext) {
    c.json({ 
      match: "Exact Static", 
      priority: 1 
    });
  }
}

// 2. Param Match (Medium Priority)
class ParamFileRoute extends XerusRoute {
  method = Method.GET;
  path = "/files/:id";

  async handle(c: HTTPContext) {
    c.json({ 
      match: "Param ID", 
      id: c.getParam("id"),
      priority: 2 
    });
  }
}

// 3. Wildcard Match (Lowest Priority / Catch-all)
class WildcardFileRoute extends XerusRoute {
  method = Method.GET;
  path = "/files/*";

  async handle(c: HTTPContext) {
    c.json({ 
      match: "Wildcard Catch-All", 
      path: c.path,
      priority: 3 
    });
  }
}

// Mount the classes
// The order here doesn't matter; the Trie router in Xerus.ts 
// automatically sorts by precedence during the search.
app.mount(StaticFileRoute, ParamFileRoute, WildcardFileRoute);

console.log("🚀 Precedence example running on http://localhost:8080");
console.log("Try /files/static vs /files/123 vs /files/any/other/path");

await app.listen(8080);