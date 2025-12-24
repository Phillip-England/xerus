import type { HTTPContext } from "../src/HTTPContext";
import { Method } from "../src/Method";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import type { InjectableStore } from "../src/RouteFields";
import type { TypeValidator } from "../src/TypeValidator";
import { Inject } from "../src/RouteFields";
import { html } from "../src/std/Response";
import { query } from "../src/std/Request";
import { Validate, Validator } from "../src/Validator";

class QuerySearch implements TypeValidator {
  value: string = ''
  async validate(c: HTTPContext) {
    this.value = query(c, 'search', 'again!')
  }
}

class BasicService implements InjectableStore {
  querySearch = Validate(QuerySearch)
  someValue = ""
  async before(c: HTTPContext) {
    this.someValue = 'dog'
    console.log('before')
  }
  async after(c: HTTPContext) {
    console.log('after')
  }
}

class HomeRoute extends XerusRoute {
  path = "/"
  method = Method.GET
  inject = [
    Inject(BasicService)
  ]
  async handle(c: HTTPContext) {
    let basicService = c.service(BasicService)
    console.log(basicService.querySearch.value) // again!
    html(c, "<p>Hello, World!</p>")
  }
}

const app = new Xerus();

app.mount(HomeRoute)

await app.listen(8080)


