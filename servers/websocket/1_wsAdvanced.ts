// PATH: /home/jacex/src/xerus/servers/websocket/1_wsAdvanced.ts

import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import type { WSContext } from "../../src/WSContext";
import type { TestStore } from "../TestStore";

// 1) Pub/Sub (OPEN + MESSAGE) for /ws/room/:name
class RoomOpen extends XerusRoute<HTTPContext<TestStore>> {
  method = Method.WS_OPEN;
  path = "/ws/room/:name";

  async handle(c: HTTPContext<TestStore>) {
    let ws = c.ws()
    const room = c.getParam("name");
    ws.subscribe(room);
    ws.publish(room, `User joined ${room}`);
  }
}

class RoomMessage extends XerusRoute<HTTPContext<TestStore>> {
  method = Method.WS_MESSAGE;
  path = "/ws/room/:name";

  async handle(c: HTTPContext<TestStore>) {
    let ws = c.ws()
    const room = c.getParam("name");
    ws.publish(room, ws.message);
  }
}

// 2) Binary Echo (MESSAGE) for /ws/binary
class BinaryEcho extends XerusRoute<HTTPContext<TestStore>> {
  method = Method.WS_MESSAGE;
  path = "/ws/binary";

  async handle(c: HTTPContext<TestStore>) {
    let ws = c.ws()
    ws.send(ws.message);
  }
}

// 3) Close tracking (CLOSE) + HTTP stats endpoint
let closedConnections = 0;

class WsStats extends XerusRoute<HTTPContext<TestStore>> {
  method = Method.GET;
  path = "/ws-stats";

  async handle(c: HTTPContext<TestStore>) {
    c.json({ closed: closedConnections });
  }
}

class LifecycleClose extends XerusRoute<HTTPContext<TestStore>> {
  method = Method.WS_CLOSE;
  path = "/ws/lifecycle";

  async handle(_c: HTTPContext<TestStore>) {
    closedConnections++;
  }
}

export function wsAdvancedMethods(app: Xerus<TestStore>) {
  app.mount(RoomOpen, RoomMessage, BinaryEcho, WsStats, LifecycleClose);
}
