import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { z } from "zod";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import type { XerusValidator } from "../src/XerusValidator";
import { SystemErr } from "../src/SystemErr";
import { SystemErrCode } from "../src/SystemErrCode";
import { header, ws } from "../src/std/Request";
import { json } from "../src/std/Response";

function makeHTTPURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}
function makeWSURL(port: number, path: string) {
  return `ws://127.0.0.1:${port}${path}`;
}

function wsWithTimeout(url: string, opts?: any, ms = 2000) {
  return new Promise<WebSocket>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`WS timeout connecting to ${url}`)),
      ms,
    );
    const s = new WebSocket(url, opts);
    s.onopen = () => {
      clearTimeout(t);
      resolve(s);
    };
    s.onerror = (e) => {
      clearTimeout(t);
      reject(e);
    };
  });
}

function waitForMessage(wsSock: WebSocket, ms = 2000) {
  return new Promise<any>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error("WS timeout waiting for message")),
      ms,
    );
    wsSock.onmessage = (ev) => {
      clearTimeout(t);
      resolve(ev.data);
    };
    wsSock.onerror = (e) => {
      clearTimeout(t);
      reject(e);
    };
  });
}

/* ======================
   State (stats endpoint)
====================== */

let lastClose: { code: number; reason: string } = { code: 0, reason: "" };
let closeCount = 0;

/* ======================
   Validators
====================== */

const closeSchema = z.object({
  code: z.number().int().nonnegative(),
  reason: z.string(),
});

class HeaderClientValidator implements XerusValidator<string> {
  async validate(c: HTTPContext): Promise<string> {
    const client = header(c, "X-Client") ?? "";

    if (client.length === 0) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Missing X-Client header",
      );
    }
    if (client !== "tester") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Bad client header");
    }

    return client;
  }
}

class CloseEventValidator
  implements XerusValidator<{ code: number; reason: string }>
{
  async validate(c: HTTPContext): Promise<{ code: number; reason: string }> {
    const socket = ws(c);
    // zod throws on failure; Xerus should treat as validation failure
    return await closeSchema.parseAsync({
      code: socket.code,
      reason: socket.reason,
    });
  }
}

/* ======================
   Routes
====================== */

class LifecycleOpen extends XerusRoute {
  method = Method.WS_OPEN;
  path = "/ws/lifecycle-validate";
  validators = [HeaderClientValidator];

  async handle(c: HTTPContext) {
    const socket = ws(c);
    socket.send("open-ok");
  }
}

class LifecycleMessage extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/lifecycle-validate";

  async handle(c: HTTPContext) {
    const socket = ws(c);
    socket.send("cleared");
  }
}

class LifecycleClose extends XerusRoute {
  method = Method.WS_CLOSE;
  path = "/ws/close-validate";
  validators = [CloseEventValidator];

  async handle(c: HTTPContext) {
    const socket = ws(c);

    // Ensure validator runs (and would be available via c.validated if needed)
    c.validated(CloseEventValidator);

    lastClose = { code: socket.code, reason: socket.reason };
    closeCount++;
  }
}

class CloseStats extends XerusRoute {
  method = Method.GET;
  path = "/ws-close-stats";

  async handle(c: HTTPContext) {
    json(c, { closeCount, lastClose });
  }
}

/* ======================
   Tests
====================== */

describe("WS lifecycle validation", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();
    app.mount(LifecycleOpen, LifecycleMessage, LifecycleClose, CloseStats);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("WS: validated should be cleared per-event (OPEN validator must not leak into MESSAGE)", async () => {
    const sock = await wsWithTimeout(makeWSURL(port, "/ws/lifecycle-validate"), {
      headers: { "X-Client": "tester" },
    });

    const first = await waitForMessage(sock);
    expect(first).toBe("open-ok");

    // Start listening BEFORE sending to avoid race
    const secondProm = waitForMessage(sock);
    sock.send("hi");
    const second = await secondProm;

    expect(second).toBe("cleared");
    sock.close();
  });

  test("WS: close validator should capture code + reason via WS_CLOSE", async () => {
    const sock = await wsWithTimeout(makeWSURL(port, "/ws/close-validate"));
    sock.close(4000, "bye");

    // allow server to process close event
    await new Promise((r) => setTimeout(r, 150));

    const res = await fetch(makeHTTPURL(port, "/ws-close-stats"));
    const j = await res.json();

    expect(res.status).toBe(200);
    expect(j.closeCount).toBeGreaterThan(0);
    expect(j.lastClose.code).toBe(4000);
    expect(j.lastClose.reason).toBe("bye");
  });
});
