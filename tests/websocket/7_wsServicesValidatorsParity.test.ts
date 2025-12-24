import { expect, test } from "bun:test";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import { ws } from "../../src/std/Request";

class MsgValidator {
  async validate(c: HTTPContext) {
    // For WS MESSAGE routes, raw msg is in c._wsMessage
    return String(c._wsMessage ?? "");
  }
}

class PerMessageService {
  msg = "";
  async init(c: HTTPContext) {
    this.msg = c.validated(MsgValidator);
  }
}

class WsMessageRoute extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws";
  validators = [MsgValidator];
  services = [PerMessageService];

  async handle(c: HTTPContext) {
    const w = ws(c);
    const svc = c.service(PerMessageService);
    w.send(JSON.stringify({ ok: true, msg: svc.msg }));
  }
}

test("WS: validators[] + services[] work (same pipeline as HTTP)", async () => {
  const app = new Xerus();
  app.mount(WsMessageRoute);

  const server = await app.listen(0);
  const url = `ws://localhost:${server.port}/ws`;

  const sock = new WebSocket(url);

  const nextMessage = () =>
    new Promise<any>((resolve, reject) => {
      const onMsg = (ev: MessageEvent) => {
        sock.removeEventListener("message", onMsg);
        resolve(JSON.parse(String(ev.data)));
      };
      sock.addEventListener("message", onMsg);
      sock.addEventListener("error", (e) => reject(e), { once: true });
    });

  await new Promise<void>((resolve, reject) => {
    sock.addEventListener("open", () => resolve(), { once: true });
    sock.addEventListener("error", (e) => reject(e), { once: true });
  });

  sock.send("hello-ws");
  const m1 = await nextMessage();

  expect(m1.ok).toBe(true);
  expect(m1.msg).toBe("hello-ws");

  sock.close(1000, "bye");
  await new Promise<void>((resolve) => sock.addEventListener("close", () => resolve(), { once: true }));

  server.stop(true);
});
