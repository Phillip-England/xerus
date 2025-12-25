import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import type { TypeValidator } from "../src/XerusValidator";
import { json } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

async function readJSON(res: Response) {
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (!ct.includes("application/json")) {
    return { _nonJson: await res.text() };
  }
  return await res.json();
}

describe("validators: must return value + deepFreeze behavior", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    class UndefinedValidator implements TypeValidator<any> {
      async validate(_c: HTTPContext) {
        // INTENTIONALLY returns undefined
        return undefined;
      }
    }

    class FreezeValidator implements TypeValidator<any> {
      async validate(_c: HTTPContext) {
        return {
          a: 1,
          nested: { b: 2 },
          arr: [{ x: 1 }, { x: 2 }],
        };
      }
    }

    class ValidatorReturnRoute extends XerusRoute {
      method = Method.GET;
      path = "/v/undefined";
      validators = [UndefinedValidator];
      async handle(_c: HTTPContext) {
        // should never reach: validator should throw first
        throw new Error("should-not-reach");
      }
    }

    class ValidatorFreezeRoute extends XerusRoute {
      method = Method.GET;
      path = "/v/freeze";
      validators = [FreezeValidator];
      async handle(c: HTTPContext) {
        const v = c.validated(FreezeValidator);

        // prove frozen: Object.isFrozen on plain objects/arrays should be true
        const frozen = {
          root: Object.isFrozen(v as any),
          nested: Object.isFrozen((v as any).nested),
          arr: Object.isFrozen((v as any).arr),
          arr0: Object.isFrozen((v as any).arr[0]),
        };

        // attempt mutation: should not change values (and in strict mode often throws)
        let mutationError: string | null = null;
        try {
          (v as any).a = 999;
          (v as any).nested.b = 999;
          (v as any).arr[0].x = 999;
          (v as any).arr.push({ x: 999 });
        } catch (e: any) {
          mutationError = e?.message ?? String(e);
        }

        json(c, {
          frozen,
          afterAttempt: {
            a: (v as any).a,
            nestedB: (v as any).nested.b,
            arr0x: (v as any).arr[0].x,
            arrLen: (v as any).arr.length,
          },
          mutationError,
        });
      }
    }

    app.mount(ValidatorReturnRoute, ValidatorFreezeRoute);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("validator that returns undefined becomes a 500 with INTERNAL_SERVER_ERROR payload", async () => {
    const res = await fetch(makeURL(port, "/v/undefined"));
    expect(res.status).toBe(500);

    const body = await readJSON(res);
    expect(body?.error?.code).toBe("INTERNAL_SERVER_ERROR");
    expect(String(body?.error?.detail ?? "")).toContain("did not return a value");
  });

  test("validator values are deep-frozen by default and mutation does not succeed", async () => {
    const res = await fetch(makeURL(port, "/v/freeze"));
    expect(res.status).toBe(200);

    const body = await readJSON(res);

    expect(body.frozen.root).toBe(true);
    expect(body.frozen.nested).toBe(true);
    expect(body.frozen.arr).toBe(true);
    expect(body.frozen.arr0).toBe(true);

    // values should remain unchanged
    expect(body.afterAttempt.a).toBe(1);
    expect(body.afterAttempt.nestedB).toBe(2);
    expect(body.afterAttempt.arr0x).toBe(1);
    expect(body.afterAttempt.arrLen).toBe(2);

    // mutationError may be null depending on runtime strictness,
    // but either way state should not change (asserted above).
  });
});
