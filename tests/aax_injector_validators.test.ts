import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import type { XerusValidator } from "../src/XerusValidator";
import type { HTTPContext } from "../src/HTTPContext";
import type { InjectableStore } from "../src/RouteFields";
import { Method } from "../src/Method";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { query } from "../src/std/Request";
import { json } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

/* ======================
   Validator + Service + Route
====================== */

class SomeQueryParam implements XerusValidator {
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

/* ======================
   Tests
====================== */

describe("Injector + Validators", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();
    app.mount(InjectorValidatorRoute);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("injected service should share the same validator instance as c.validated(Type)", async () => {
    const res = await fetch(makeURL(port, "/injector-validator?q=hello"));
    const j = await res.json();

    expect(res.status).toBe(200);
    expect(j.fromSvc).toBe("hello");
    expect(j.fromData).toBe("hello");
    expect(j.sameInstance).toBe(true);
    expect(j.computed).toBe("computed:hello");
  });

  test("should not leak across requests (computed should track current request)", async () => {
    const r1 = await fetch(makeURL(port, "/injector-validator?q=A"));
    const j1 = await r1.json();

    expect(r1.status).toBe(200);
    expect(j1.fromSvc).toBe("A");
    expect(j1.computed).toBe("computed:A");

    const r2 = await fetch(makeURL(port, "/injector-validator?q=B"));
    const j2 = await r2.json();

    expect(r2.status).toBe(200);
    expect(j2.fromSvc).toBe("B");
    expect(j2.computed).toBe("computed:B");
  });

  test("missing query param should default via query fallback", async () => {
    const res = await fetch(makeURL(port, "/injector-validator"));
    const j = await res.json();

    expect(res.status).toBe(200);
    expect(j.fromSvc).toBe("");
    expect(j.fromData).toBe("");
    expect(j.sameInstance).toBe(true);
    expect(j.computed).toBe("computed:");
  });
});
