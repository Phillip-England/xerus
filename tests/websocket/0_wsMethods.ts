import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { GroupHeaderMiddleware } from "../middleware/mwGroupHeader"; // Updated import
import type { WSContext } from "../../src/WSContext";
import type { TestStore } from "../TestStore";
import type { HTTPContext } from "../../src/HTTPContext";

class WSEcho extends XerusRoute<TestStore> {
  method = Method.WS_MESSAGE;
  path = "/ws/echo";
  async handle(c: HTTPContext<TestStore>) {
    let ws = c.ws();
    ws.send(`echo: ${ws.message}`);
  }
}

class WSChatOpen extends XerusRoute<TestStore> {
  method = Method.WS_OPEN;
  path = "/ws/chat";
  onMount() {
    this.use(GroupHeaderMiddleware);
  }
  async handle(c: HTTPContext<TestStore>) {
    let ws = c.ws();
    const auth = c.getResHeader("X-Group-Auth");
    ws.send(`auth-${auth}`);
  }
}

class WSChatMessage extends XerusRoute<HTTPContext<TestStore>> {
  method = Method.WS_MESSAGE;
  path = "/ws/chat";
  async handle(c: HTTPContext<TestStore>) {
    let ws = c.ws();
    ws.send(`chat: ${ws.message}`);
  }
}

export function wsMethods(app: Xerus<TestStore>) {
  app.mount(WSEcho, WSChatOpen, WSChatMessage);
}