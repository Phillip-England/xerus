import type { TypeValidator } from "../../src/TypeValidator";
import type { HTTPContext } from "../../src/HTTPContext";
import { Method } from "../../src/Method";
import { type InjectableStore, Inject } from "../../src/RouteFields";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { query } from "../../src/std/Request";
import { json } from "../../src/std/Response";
import { Validator } from "../../src/Validator";

class SomeQueryParam implements TypeValidator {
  query: string = "";
  async validate(c: HTTPContext): Promise<void> {
    this.query = query(c, "q", "");
  }
}

class UserService implements InjectableStore {
  storeKey = "UserService";
  qp = Validator.Ctx(SomeQueryParam);
  computed: string = "";

  async init(c: HTTPContext): Promise<void> {
    const fromSvc = c.service(SomeQueryParam);
    if (!fromSvc || typeof fromSvc.query !== "string") {
      throw new Error(
        "Expected SomeQueryParam to exist in c.service(SomeQueryParam) before init()",
      );
    }
    if (fromSvc !== this.qp) {
      throw new Error(
        "Expected service validator to be same instance as c.service(SomeQueryParam)",
      );
    }
    this.computed = `computed:${this.qp.query}`;
  }
}

class InjectorValidatorRoute extends XerusRoute {
  method = Method.GET;
  path = "/injector-validator";
  user = Inject(UserService);

  async handle(c: HTTPContext): Promise<void> {
    const fromSvc = this.user.qp.query;
    const fromData = c.service(SomeQueryParam).query;

    json(c, {
      fromSvc,
      fromData, // ✅ match test expectation
      sameInstance: c.service(SomeQueryParam) === this.user.qp,
      computed: this.user.computed,
    });
  }
}

export function injectorValidators(app: Xerus) {
  app.mount(InjectorValidatorRoute);
}
