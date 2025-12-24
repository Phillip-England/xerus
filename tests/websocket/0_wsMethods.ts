import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { Inject } from "../../src/RouteFields";
import { TestStore } from "../TestStore";
import type { HTTPContext } from "../../src/HTTPContext";
import type { XerusMiddleware } from "../../src/Middleware";
import type { AnyContext } from "../../src/MiddlewareFn";
import type { MiddlewareNextFn } from "../../src/MiddlewareNextFn";

class GroupHeaderMiddleware implements XerusMiddleware {
  async execute(c: AnyContext, next: MiddlewareNextFn) {
    c.setHeader("X-Group-Auth", "passed");
    await next();
  }
}

class WSEcho extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/echo";
  store = Inject(TestStore);

  async handle(c: HTTPContext) {
    let ws = c.ws();
    ws.send(`echo: ${ws.message}`);
  }
}

class WSChatOpen extends XerusRoute {
  method = Method.WS_OPEN;
  path = "/ws/chat";
  store = Inject(TestStore);

  onMount() {
    this.use(GroupHeaderMiddleware);
  }

  async handle(c: HTTPContext) {
    let ws = c.ws();
    // FIX: Call .get() on the HeaderRef
    const auth = c.getResHeader("X-Group-Auth").get();
    ws.send(`auth-${auth}`);
  }
}

class WSChatMessage extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/chat";
  store = Inject(TestStore);

  async handle(c: HTTPContext) {
    let ws = c.ws();
    ws.send(`chat: ${ws.message}`);
  }
}

export function wsMethods(app: Xerus) {
  app.mount(WSEcho, WSChatOpen, WSChatMessage);
}