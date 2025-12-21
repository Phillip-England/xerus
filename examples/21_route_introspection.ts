import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { logger } from "../src/Middleware";
import type { WSContext } from "../src/WSContext";

type Store = Record<string, any>;

const app = new Xerus<Store>();

// 1. Connection established
class WSOpenRoute extends XerusRoute<Store, WSContext<Store>> {
  method = Method.WS_OPEN;
  path = "/ws/chat";

  onMount() {
    this.use(logger);
  }

  async handle(c: WSContext<Store>) {
    // You can inspect the initial HTTP upgrade request via c.http
    console.log(`Connection opened from: ${c.http.getClientIP()}`);
    c.ws.send("👋 Welcome!");
  }
}

// 2. Incoming data handler
class WSMessageRoute extends XerusRoute<Store, WSContext<Store>> {
  method = Method.WS_MESSAGE;
  path = "/ws/chat";

  onMount() {
    this.use(logger);
  }

  async handle(c: WSContext<Store>) {
    c.ws.send(`echo: ${c.message}`);
  }
}

// 3. Cleanup handler
class WSCloseRoute extends XerusRoute<Store, WSContext<Store>> {
  method = Method.WS_CLOSE;
  path = "/ws/chat";

  onMount() {
    this.use(logger);
  }

  async handle(c: WSContext<Store>) {
    console.log(`Client left. Code: ${c.code}, Reason: ${c.reason}`);
  }
}

// Mount the class blueprints
app.mount(WSOpenRoute, WSMessageRoute, WSCloseRoute);

console.log("🚀 Route Introspection example running on ws://localhost:8080/ws/chat");
await app.listen(8080);
