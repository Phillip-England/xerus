import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { WSContext } from "../src/WSContext";

const app = new Xerus();

// 1. Connection Open Handler
class ChatOpen extends XerusRoute<Record<string, any>, WSContext> {
  override method = Method.WS_OPEN;
  override path = "/chat";

  override async handle(c: WSContext) {
    console.log("Client connected to:", c.http.path);
    c.ws.send("Welcome to Xerus Chat!");
  }
}

// 2. Message Received Handler
class ChatMessage extends XerusRoute<Record<string, any>, WSContext> {
  override method = Method.WS_MESSAGE;
  override path = "/chat";

  override async handle(c: WSContext) {
    const msg = c.message?.toString?.() ?? "";

    c.ws.send(`You said: ${msg}`);

    if (msg === "close") {
      c.ws.close(1000, "Bye!");
    }
  }
}

// 3. Connection Close Handler
class ChatClose extends XerusRoute<Record<string, any>, WSContext> {
  override method = Method.WS_CLOSE;
  override path = "/chat";

  override async handle(c: WSContext) {
    console.log(`Closed: ${c.code} - ${c.reason}`);
  }
}

// Mount the classes
app.mount(ChatOpen, ChatMessage, ChatClose);

console.log("🚀 WebSocket chat running. Connect via ws://localhost:8080/chat");
await app.listen(8080);
