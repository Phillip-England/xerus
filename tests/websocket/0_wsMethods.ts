import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { Inject } from "../../src/RouteFields";
import { TestStore } from "../TestStore";
import type { HTTPContext } from "../../src/HTTPContext";
import type { ServiceLifecycle } from "../../src/RouteFields";
import { setHeader } from "../../src/std/Response";
import { ws } from "../../src/std/Request";

class GroupHeaderService implements ServiceLifecycle {
  async before(c: HTTPContext) {
    setHeader(c, "X-Group-Auth", "passed");
  }
}

class WSEcho extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/echo";
  store = Inject(TestStore);
  async handle(c: HTTPContext) {
    let socket = ws(c);
    socket.send(`echo: ${socket.message}`);
  }
}

class WSChatOpen extends XerusRoute {
  method = Method.WS_OPEN;
  path = "/ws/chat";
  store = Inject(TestStore);
  inject = [Inject(GroupHeaderService)];

  async handle(c: HTTPContext) {
    let socket = ws(c);
    // Access the header directly from the mutable response object
    const auth = c.res.getHeader("X-Group-Auth");
    socket.send(`auth-${auth}`);
  }
}

class WSChatMessage extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/chat";
  store = Inject(TestStore);
  async handle(c: HTTPContext) {
    let socket = ws(c);
    socket.send(`chat: ${socket.message}`);
  }
}

export function wsMethods(app: Xerus) {
  app.mount(WSEcho, WSChatOpen, WSChatMessage);
}