import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import type { ServiceLifecycle } from "../src/RouteFields";
import { setHeader } from "../src/std/Response";
import { ws } from "../src/std/Request";
import { TestStore } from "./TestStore";

function makeWSURL(port: number, path: string) {
  return `ws://127.0.0.1:${port}${path}`;
}

/* ======================
   Services
====================== */

class GroupHeaderService implements XerusService {
  async before(c: HTTPContext) {
    setHeader(c, "X-Group-Auth", "passed");
  }
}

/* ======================
   WebSocket Routes
====================== */

class WSEcho extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/echo";
  services = [TestStore];

  async handle(c: HTTPContext) {
    const socket = ws(c);
    socket.send(`echo: ${socket.message}`);
  }
}

class WSChatOpen extends XerusRoute {
  method = Method.WS_OPEN;
  path = "/ws/chat";
  services = [TestStore, GroupHeaderService];

  async handle(c: HTTPContext) {
    const socket = ws(c);
    const auth = c.res.getHeader("X-Group-Auth");
    socket.send(`auth-${auth}`);
  }
}

class WSChatMessage extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/chat";
  services = [TestStore];

  async handle(c: HTTPContext) {
    const socket = ws(c);
    socket.send(`chat: ${socket.message}`);
  }
}

/* ======================
   Tests
====================== */

describe("WebSocket Methods", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();
    app.mount(WSEcho, WSChatOpen, WSChatMessage);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("WebSocket: Should echo messages back", async () => {
    const socket = new WebSocket(makeWSURL(port, "/ws/echo"));

    const response = await new Promise<string>((resolve, reject) => {
      socket.onopen = () => socket.send("hello xerus");
      socket.onmessage = (event) => {
        socket.close();
        resolve(String(event.data));
      };
      socket.onerror = (err) => reject(err);
    });

    expect(response).toBe("echo: hello xerus");
  });

  test("WebSocket: Should respect middleware on protected route", async () => {
    const socket = new WebSocket(makeWSURL(port, "/ws/chat"));

    const response = await new Promise<string>((resolve) => {
      socket.onmessage = (event) => {
        socket.close();
        resolve(String(event.data));
      };
    });

    // GroupHeaderService sets X-Group-Auth = passed
    expect(response).toBe("auth-passed");
  });

  test("WebSocket: Middleware echo test", async () => {
    const socket = new WebSocket(makeWSURL(port, "/ws/chat"));

    const response = await new Promise<string>((resolve) => {
      let count = 0;

      socket.onmessage = (event) => {
        count++;

        if (count === 1) {
          // first message is auth on WS_OPEN
          socket.send("ping");
        } else {
          socket.close();
          resolve(String(event.data));
        }
      };
    });

    expect(response).toBe("chat: ping");
  });
});
