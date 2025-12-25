import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import type { XerusValidator } from "../src/XerusValidator";
import { json } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}
async function readJSON(res: Response) {
  return await res.json();
}

describe("validator caching: service + route share one evaluation per request", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    let validateCalls = 0;

    class CountedValidator implements XerusValidator {
      async validate(_c: HTTPContext) {
        validateCalls++;
        return { ok: true, n: validateCalls };
      }
    }

    class UsesValidatorService {
      validators = [CountedValidator];
      seenN: number = -1;
      async init(c: HTTPContext) {
        const v = c.validated(CountedValidator);
        this.seenN = v.n;
      }
    }

    class CacheRoute extends XerusRoute {
      method = Method.GET;
      path = "/v/cache";
      validators = [CountedValidator];
      services = [UsesValidatorService];
      async handle(c: HTTPContext) {
        const v = c.validated(CountedValidator);
        const svc = c.service(UsesValidatorService);

        json(c, {
          validateCalls,
          routeValueN: v.n,
          serviceValueN: svc.seenN,
          sameN: v.n === svc.seenN,
        });
      }
    }

    app.mount(CacheRoute);
    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("single request: CountedValidator runs once even if used by both route + service", async () => {
    const res = await fetch(makeURL(port, "/v/cache"));
    expect(res.status).toBe(200);
    const body = await readJSON(res);

    expect(body.sameN).toBe(true);
    expect(body.validateCalls).toBe(1);
    expect(body.routeValueN).toBe(1);
    expect(body.serviceValueN).toBe(1);
  });

  test("second request: validator runs again (per request), still once total for that request", async () => {
    const res = await fetch(makeURL(port, "/v/cache"));
    expect(res.status).toBe(200);
    const body = await readJSON(res);

    expect(body.sameN).toBe(true);
    expect(body.validateCalls).toBe(2);
    expect(body.routeValueN).toBe(2);
    expect(body.serviceValueN).toBe(2);
  });
});
