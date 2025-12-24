import type { HTTPContext } from "../src/HTTPContext";
import { LoggerService } from "../src/LoggerService";
import { Method } from "../src/Method";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { html } from "../src/std/Response";

class HomeRoute extends XerusRoute {
  path = "/"
  method = Method.GET
  async handle(c: HTTPContext) {
    html(c, "<p>Hello, World!</p>")
  }
}

const app = new Xerus();

app.use(LoggerService)

app.mount(HomeRoute)

await app.listen(8080)


