import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { InjectableStore } from "../src/RouteFields";
import type { HTTPContext } from "../src/HTTPContext";
import { ws } from "../src/std/Request";

/* ===============================
   Test Helpers
================================ */

function wsURL(port: number, path: string) {
  return `ws://127.0.0.1:${port}${path}`;
}

/* ===============================
   Services
================================ */

class ContextStateService implements InjectableStore {
  storeKey = "ContextStateService";
  data: string = "";

  setData(val: string) {
    this.data = val;
  }
}

/* ===============================
   Routes
================================ */

class SafetyCheckRoute extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/safety/context";
  services = [ContextStateService];

  async handle(c: HTTPContext) {
    const socket = ws(c);
    const msg = String(socket.message);
    const svc = c.service(ContextStateService);

    if (msg.startsWith("SET:")) {
      const val = msg.split(":")[1] ?? "";
      svc.setData(val);
      socket.send(`OK:SET:${val}`);
      return;
    }

    if (msg === "CHECK") {
      socket.send(`VALUE:${svc.data || "EMPTY"}`);
    }
  }
}

class MessageIsolationRoute extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/safety/isolation";

  async handle(c: HTTPContext) {
    const socket = ws(c);
    socket.send(`ECHO:${socket.message}`);
  }
}

/* ===============================
   Test Suite
================================ */

describe("WS Safety", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();
    app.mount(SafetyCheckRoute, MessageIsolationRoute);
    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("WS Safety: Service state should NOT leak between messages", async () => {
    const socket = new WebSocket(wsURL(port, "/ws/safety/context"));

    const result = await new Promise<string[]>((resolve, reject) => {
      const logs: string[] = [];

      socket.onopen = () => {
        socket.send("SET:SECRET_DATA");
      };

      socket.onmessage = (event) => {
        const msg = String(event.data);
        logs.push(msg);

        if (msg.startsWith("OK:SET")) {
          socket.send("CHECK");
        } else if (msg.startsWith("VALUE:")) {
          socket.close();
          resolve(logs);
        }
      };

      socket.onerror = reject;
    });

    expect(result[0]).toBe("OK:SET:SECRET_DATA");
    expect(result[1]).toBe("VALUE:EMPTY");
  });

  test("WS Safety: Message content should be isolated per message", async () => {
    const socket = new WebSocket(wsURL(port, "/ws/safety/isolation"));

    const messages = await new Promise<string[]>((resolve) => {
      const logs: string[] = [];

      socket.onopen = () => {
        socket.send("A");
        socket.send("BBB");
        socket.send("A");
      };

      socket.onmessage = (event) => {
        logs.push(String(event.data));
        if (logs.length === 3) {
          socket.close();
          resolve(logs);
        }
      };
    });

    expect(messages[0]).toBe("ECHO:A");
    expect(messages[1]).toBe("ECHO:BBB");
    expect(messages[2]).toBe("ECHO:A");
  });
});
