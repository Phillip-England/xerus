import type { TypeValidator } from "../../src/TypeValidator";
import type { HTTPContext } from "../../src/HTTPContext";
import { Method } from "../../src/Method";
import type { InjectableStore } from "../../src/RouteFields";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { query } from "../../src/std/Request";
import { json } from "../../src/std/Response";

class SomeQueryParam implements TypeValidator {
  async validate(c: HTTPContext) {
    const q = query(c, "q", "");
    return { query: q };
  }
}

class UserService implements InjectableStore {
  storeKey = "UserService";

  qp?: { query: string };
  computed: string = "";

  async init(c: HTTPContext): Promise<void> {
    // Pull from the validator cache (and/or trigger it if not run yet).
    const qp = c.validated(SomeQueryParam);

    this.qp = qp;
    this.computed = `computed:${qp.query}`;
  }
}

class InjectorValidatorRoute extends XerusRoute {
  method = Method.GET;
  path = "/injector-validator";
  services = [UserService];
  validators = [SomeQueryParam];

  async handle(c: HTTPContext): Promise<void> {
    const user = c.service(UserService);
    const qp = c.validated(SomeQueryParam);

    json(c, {
      fromSvc: user.qp?.query ?? "",
      fromData: qp.query,
      sameInstance: user.qp === qp,
      computed: user.computed,
    });
  }
}

export function injectorValidators(app: Xerus) {
  app.mount(InjectorValidatorRoute);
}
