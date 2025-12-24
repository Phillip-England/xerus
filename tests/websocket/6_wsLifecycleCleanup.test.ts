import { expect, test } from "bun:test";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import { ws } from "../../src/std/Request";

// Service that should be recreated per WS event (because resetScope() runs)
class PerMessageService {
  value: number = Math.random();
}

// WS route (MESSAGE) that uses a service and can set __holdRelease
class WsMessageRoute extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws";
  services = [PerMessageService];

  async handle(c: HTTPContext) {
    const w = ws(c);

    const svc = c.service(PerMessageService);

    // If client says "hold", set a hold promise to simulate async teardown work
    if (String(c._wsMessage ?? "") === "hold") {
      c.__holdRelease = new Promise<void>((resolve) => setTimeout(resolve, 50));
    }

    w.send(JSON.stringify({ serviceValue: svc.value }));
  }
}

test("WS contexts are scrubbed + __holdRelease does not double-release; services do not leak per message", async () => {
  const app = new Xerus();
  app.mount(WsMessageRoute);

  // Monkeypatch pool release to count releases (contextPool is private, but test can access via `as any`)
  const pool = (app as any).contextPool;
  expect(pool).toBeTruthy();

  let releaseCount = 0;
  const origRelease = pool.release.bind(pool);
  pool.release = (item: any) => {
    releaseCount++;
    return origRelease(item);
  };

  const server = await app.listen(0);
  const url = `ws://localhost:${server.port}/ws`;

  const sock = new WebSocket(url);

  const nextMessage = () =>
    new Promise<any>((resolve, reject) => {
      const onMsg = (ev: MessageEvent) => {
        sock.removeEventListener("message", onMsg);
        resolve(JSON.parse(String(ev.data)));
      };
      const onErr = (ev: Event) => {
        sock.removeEventListener("message", onMsg);
        reject(ev);
      };
      sock.addEventListener("message", onMsg);
      sock.addEventListener("error", onErr, { once: true });
    });

  await new Promise<void>((resolve, reject) => {
    sock.addEventListener("open", () => resolve(), { once: true });
    sock.addEventListener("error", (e) => reject(e), { once: true });
  });

  // Send twice; value should differ if service is recreated per WS event
  sock.send("first");
  const m1 = await nextMessage();

  sock.send("second");
  const m2 = await nextMessage();

  expect(typeof m1.serviceValue).toBe("number");
  expect(typeof m2.serviceValue).toBe("number");
  expect(m1.serviceValue).not.toBe(m2.serviceValue);

  // Now trigger hold and close immediately; release should happen exactly once,
  // after hold resolves, not twice (once immediate, once later).
  sock.send("hold");
  await nextMessage();

  sock.close(1000, "bye");

  await new Promise<void>((resolve) => {
    sock.addEventListener("close", () => resolve(), { once: true });
  });

  // Wait long enough for hold to resolve + release to run
  await new Promise((r) => setTimeout(r, 120));

  expect(releaseCount).toBe(1);

  server.stop(true);
});
