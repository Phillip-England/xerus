import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// Define the route as a class
class HomeRoute extends XerusRoute {
  method = Method.GET;
  path = "/";

  async handle(c: HTTPContext) {
    c.html("<h1>Hello from Xerus! 🐿️</h1>");
  }
}

// Mount the class directly
app.mount(HomeRoute);

console.log("🚀 Listening on http://localhost:8080");
await app.listen(8080);