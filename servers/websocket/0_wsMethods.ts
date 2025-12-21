import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { mwGroupHeader } from "../middleware/mwGroupHeader";
import type { WSContext } from "../../src/WSContext";
import type { TestStore } from "../TestStore";

class WSEcho extends XerusRoute<TestStore, WSContext<TestStore>> {
  method = Method.WS_MESSAGE;
  path = "/ws/echo";

  async handle(c: WSContext<TestStore>) {
    c.ws.send(`echo: ${c.message}`);
  }
}

class WSChatOpen extends XerusRoute<TestStore, WSContext<TestStore>> {
  method = Method.WS_OPEN;
  path = "/ws/chat";

  onMount() {
    this.use(mwGroupHeader);
  }

  async handle(c: WSContext<TestStore>) {
    const auth = c.http.getResHeader("X-Group-Auth");
    c.ws.send(`auth-${auth}`);
  }
}

class WSChatMessage extends XerusRoute<TestStore, WSContext<TestStore>> {
  method = Method.WS_MESSAGE;
  path = "/ws/chat";

  async handle(c: WSContext<TestStore>) {
    c.ws.send(`chat: ${c.message}`);
  }
}

export function wsMethods(app: Xerus<TestStore>) {
  app.mount(WSEcho, WSChatOpen, WSChatMessage);
}
