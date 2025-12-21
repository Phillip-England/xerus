import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { logger } from "../src/Middleware";
import type { WSContext } from "../src/WSContext";

// Define your store type for this app (add keys as you use them)
type Store = Record<string, any>;

const app = new Xerus<Store>();

// 1. Connection Open: Send a welcome message
class ChatOpen extends XerusRoute<Store, WSContext<Store>> {
  method = Method.WS_OPEN;
  path = "/ws/chat";

  onMount() {
    this.use(logger);
  }

  async handle(c: WSContext<Store>) {
    c.ws.send("👋 Welcome to the grouped chat!");
  }
}

// 2. Message Received: Echo the message back
class ChatMessage extends XerusRoute<Store, WSContext<Store>> {
  method = Method.WS_MESSAGE;
  path = "/ws/chat";

  onMount() {
    this.use(logger);
  }

  async handle(c: WSContext<Store>) {
    c.ws.send(`echo: ${c.message}`);
  }
}

// 3. Connection Closed: Log server-side
class ChatClose extends XerusRoute<Store, WSContext<Store>> {
  method = Method.WS_CLOSE;
  path = "/ws/chat";

  onMount() {
    this.use(logger);
  }

  async handle(_c: WSContext<Store>) {
    console.log(">> [Server] Client left the chat");
  }
}

// Mount the class blueprints
app.mount(ChatOpen, ChatMessage, ChatClose);

console.log("🚀 Grouped WebSocket example running on ws://localhost:8080/ws/chat");
await app.listen(8080);
