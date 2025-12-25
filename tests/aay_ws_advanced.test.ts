import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import type { InjectableStore } from "../src/RouteFields";
import { param, ws } from "../src/std/Request";
import { json } from "../src/std/Response";
import { TestStore } from "./TestStore";

function makeWSURL(port: number, path: string) {
  return `ws://127.0.0.1:${port}${path}`;
}
function makeHTTPURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

/* ======================
   WebSocket Routes
====================== */

// 1️⃣ Pub/Sub Room
class RoomOpen extends XerusRoute {
  method = Method.WS_OPEN;
  path = "/ws/room/:name";
  service = [TestStore];

  async handle(c: HTTPContext) {
    const socket = ws(c);
    const room = param(c, "name");
    socket.subscribe(room);
    socket.publish(room, `User joined ${room}`);
  }
}

class RoomMessage extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/room/:name";
  service = [TestStore];

  async handle(c: HTTPContext) {
    const socket = ws(c);
    const room = param(c, "name");
    socket.publish(room, socket.message);
  }
}

// 2️⃣ Binary echo
class BinaryEcho extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/binary";
  service = [TestStore];

  async handle(c: HTTPContext) {
    const socket = ws(c);
    socket.send(socket.message);
  }
}

// 3️⃣ Lifecycle tracking
let closedConnections = 0;

class WsStats extends XerusRoute {
  method = Method.GET;
  path = "/ws-stats";
  service = [TestStore];

  async handle(c: HTTPContext) {
    json(c, { closed: closedConnections });
  }
}

class LifecycleClose extends XerusRoute {
  method = Method.WS_CLOSE;
  path = "/ws/lifecycle";
  service = [TestStore];

  async handle(_c: HTTPContext) {
    closedConnections++;
  }
}

/* ======================
   Tests
====================== */

describe("WebSocket Advanced", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();
    app.mount(
      RoomOpen,
      RoomMessage,
      BinaryEcho,
      WsStats,
      LifecycleClose,
    );

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("WebSocket: Binary data should be preserved", async () => {
    const socket = new WebSocket(makeWSURL(port, "/ws/binary"));
    socket.binaryType = "arraybuffer";

    const input = new Uint8Array([1, 2, 3, 4, 5]);

    const result = await new Promise<Uint8Array>((resolve) => {
      socket.onopen = () => socket.send(input);
      socket.onmessage = (event) => {
        socket.close();
        resolve(new Uint8Array(event.data));
      };
    });

    expect(result).toEqual(input);
  });

test("WebSocket: Pub/Sub should broadcast to other clients", async () => {
    const clientA = new WebSocket(makeWSURL(port, "/ws/room/lobby"));
    const clientB = new WebSocket(makeWSURL(port, "/ws/room/lobby"));

    // 1. Create the promise, but DO NOT await it yet
    const resultPromise = new Promise<string>((resolve) => {
      clientB.onmessage = (event) => {
        if (event.data === "hello from A") {
          clientA.close();
          clientB.close();
          resolve(event.data); // Resolve with the data
        }
      };
    });

    // 2. Wait a moment for connections to establish
    await new Promise((r) => setTimeout(r, 100));

    // 3. Trigger the action that fulfills the promise
    clientA.send("hello from A");

    // 4. Now await the result
    const result = await resultPromise;
    expect(result).toBe("hello from A");
  });
  
  test("WebSocket: Server-side close handler should trigger", async () => {
    const pre = await fetch(makeHTTPURL(port, "/ws-stats"));
    const before = (await pre.json()).closed;

    const socket = new WebSocket(makeWSURL(port, "/ws/lifecycle"));

    await new Promise((resolve) => {
      socket.onopen = () => {
        socket.close();
        setTimeout(resolve, 100);
      };
    });

    const post = await fetch(makeHTTPURL(port, "/ws-stats"));
    const after = (await post.json()).closed;

    expect(after).toBe(before + 1);
  });
});
