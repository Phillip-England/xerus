import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import type { XerusValidator } from "../src/XerusValidator";
import { ws as wsCtx } from "../src/std/Request";

function wsURL(port: number, path: string) {
  return `ws://127.0.0.1:${port}${path}`;
}

describe("websocket: resetForWSEvent resets scope (validators/services do not leak across messages)", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    let validatorRuns = 0;
    let serviceInits = 0;

    class MsgValidator implements XerusValidator<{ msg: string }> {
      async validate(c: HTTPContext) {
        validatorRuns++;
        return { msg: String(c._wsMessage ?? "") };
      }
    }

    class PerMessageService {
      id: string = crypto.randomUUID();
      async init(_c: HTTPContext) {
        serviceInits++;
      }
    }

    class WSOpen extends XerusRoute {
      method = Method.WS_OPEN;
      path = "/ws/scope";
      async handle(c: HTTPContext) {
        wsCtx(c).send("open");
      }
    }

    class WSMessage extends XerusRoute {
      method = Method.WS_MESSAGE;
      path = "/ws/scope";
      validators = [MsgValidator];
      services = [PerMessageService];

      async handle(c: HTTPContext) {
        const v = c.validated(MsgValidator);
        const svc = c.service(PerMessageService);

        // If scope is leaking, service might be reused across messages, or validator cached.
        wsCtx(c).send(
          JSON.stringify({
            msg: v.msg,
            serviceId: svc.id,
            validatorRuns,
            serviceInits,
          }),
        );
      }
    }

    class WSClose extends XerusRoute {
      method = Method.WS_CLOSE;
      path = "/ws/scope";
      async handle(_c: HTTPContext) {}
    }

    app.mount(WSOpen, WSMessage, WSClose);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("two messages get two separate services; validator runs per message", async () => {
    const url = wsURL(port, "/ws/scope");
    const ws = new WebSocket(url);

    const received: any[] = [];
    const waitFor = (n: number) =>
      new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("timeout waiting for ws msgs")), 2500);
        const check = () => {
          if (received.length >= n) {
            clearTimeout(t);
            resolve();
          } else {
            setTimeout(check, 5);
          }
        };
        check();
      });

    ws.addEventListener("message", (ev) => {
      const text = String(ev.data);
      if (text === "open") return;
      try {
        received.push(JSON.parse(text));
      } catch {
        received.push({ raw: text });
      }
    });

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("ws open timeout")), 2500);
      ws.addEventListener("open", () => {
        clearTimeout(t);
        resolve();
      });
      ws.addEventListener("error", () => reject(new Error("ws error")));
    });

    ws.send("one");
    ws.send("two");

    await waitFor(2);

    ws.close();

    const r1 = received[0];
    const r2 = received[1];

    expect(r1.msg).toBe("one");
    expect(r2.msg).toBe("two");

    // service should be per-message (because resetScope clears services between WS events)
    expect(r1.serviceId).not.toBe(r2.serviceId);

    // validator should run once per message
    expect(r2.validatorRuns).toBeGreaterThanOrEqual(2);
    expect(r2.serviceInits).toBeGreaterThanOrEqual(2);
  });
});
