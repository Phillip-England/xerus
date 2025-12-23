// /Users/phillipengland/src/xerus/tests/http/22_injector_validators.ts
import type { TypeValidator } from "../../src/TypeValidator";
import type { HTTPContext } from "../../src/HTTPContext";
import { Method } from "../../src/Method";
import { type InjectableStore, Inject } from "../../src/RouteFields";
import { Validator } from "../../src/Validator";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";

class SomeQueryParam implements TypeValidator {
  query: string = "";
  async validate(c: HTTPContext): Promise<void> {
    this.query = c.query("q", "");
  }
}

class UserService implements InjectableStore {
  storeKey = "UserService";

  // This is the key behavior under test: validators inside an injected service
  qp = Validator.Ctx(SomeQueryParam);

  computed: string = "";

  async init(c: HTTPContext): Promise<void> {
    // Assert that the validator instance exists in DataBag by ctor *before* init() runs
    const fromData = c.data(SomeQueryParam);
    if (!fromData || typeof fromData.query !== "string") {
      throw new Error(
        "Expected SomeQueryParam to exist in c.data(SomeQueryParam) before init()",
      );
    }

    // And that the injected service's validator is the same instance
    if (fromData !== this.qp) {
      throw new Error("Expected service validator to be same instance as c.data(SomeQueryParam)");
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
    const fromData = c.data(SomeQueryParam).query;

    c.json({
      fromSvc,
      fromData,
      sameInstance: c.data(SomeQueryParam) === this.user.qp,
      computed: this.user.computed,
    });
  }
}

// ✅ match your other fixtures: export a function that mounts routes
export function injectorValidators(app: Xerus) {
  app.mount(InjectorValidatorRoute);
}
