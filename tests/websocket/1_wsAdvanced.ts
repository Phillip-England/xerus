import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Inject } from "../../src/RouteFields";
import { TestStore } from "../TestStore";
import { param, ws } from "../../src/std/Request";
import { json } from "../../src/std/Response";

// 1) Pub/Sub (OPEN + MESSAGE) for /ws/room/:name
class RoomOpen extends XerusRoute {
  method = Method.WS_OPEN;
  path = "/ws/room/:name";
  store = Inject(TestStore);

  async handle(c: HTTPContext) {
    let socket = ws(c);
    const room = param(c, "name");
    socket.subscribe(room);
    socket.publish(room, `User joined ${room}`);
  }
}

class RoomMessage extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/room/:name";
  store = Inject(TestStore);

  async handle(c: HTTPContext) {
    let socket = ws(c);
    const room = param(c, "name");
    socket.publish(room, socket.message);
  }
}

// 2) Binary Echo (MESSAGE) for /ws/binary
class BinaryEcho extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/binary";
  store = Inject(TestStore);

  async handle(c: HTTPContext) {
    let socket = ws(c);
    socket.send(socket.message);
  }
}

// 3) Close tracking (CLOSE) + HTTP stats endpoint
let closedConnections = 0;

class WsStats extends XerusRoute {
  method = Method.GET;
  path = "/ws-stats";
  store = Inject(TestStore);

  async handle(c: HTTPContext) {
    json(c, { closed: closedConnections });
  }
}

class LifecycleClose extends XerusRoute {
  method = Method.WS_CLOSE;
  path = "/ws/lifecycle";
  store = Inject(TestStore);

  async handle(_c: HTTPContext) {
    closedConnections++;
  }
}

export function wsAdvancedMethods(app: Xerus) {
  app.mount(RoomOpen, RoomMessage, BinaryEcho, WsStats, LifecycleClose);
}