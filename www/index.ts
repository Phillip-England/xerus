import type { HTTPContext } from "../src/HTTPContext";
import { Method } from "../src/Method";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import type { InjectableStore } from "../src/RouteFields";
import { Validator } from "../src/Validator";
import type { TypeValidator } from "../src/TypeValidator";
import { Inject } from "../src/RouteFields";

class QuerySearch implements TypeValidator {
  value: string = ''
  async validate(c: HTTPContext) {
    this.value = c.query('search', 'again!')
  }
}

class BasicService implements InjectableStore {
  querySearch = Validator.Ctx(QuerySearch)
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
    c.html("<p>Hello, World!</p>")
  }
}

const app = new Xerus();

app.mount(HomeRoute)

await app.listen(8080)


