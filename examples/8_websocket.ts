import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { logger } from "../src/Middleware";
import type { WSContext } from "../src/WSContext";

const app = new Xerus();

// 1. Connection Open Handler
class ChatOpen extends XerusRoute<WSContext> {
  method = Method.WS_OPEN;
  path = "/chat";

  onMount() {
    this.use(logger);
  }

  async handle(c: WSContext) {
    console.log("Client connected to:", c.http.path);
    c.ws.send("Welcome to Xerus Chat!");
  }
}

// 2. Message Received Handler
class ChatMessage extends XerusRoute<WSContext> {
  method = Method.WS_MESSAGE;
  path = "/chat";

  onMount() {
    this.use(logger);
  }

  async handle(c: WSContext) {
    // c.message contains the incoming data
    c.ws.send(`You said: ${c.message}`);
    
    if (c.message === "close") {
      c.ws.close(1000, "Bye!");
    }
  }
}

// 3. Connection Close Handler
class ChatClose extends XerusRoute<WSContext> {
  method = Method.WS_CLOSE;
  path = "/chat";

  async handle(c: WSContext) {
    // Access close code and reason from context
    console.log(`Closed: ${c.code} - ${c.reason}`);
  }
}

// Mount the classes
app.mount(ChatOpen, ChatMessage, ChatClose);

console.log("🚀 WebSocket chat running. Connect via ws://localhost:8080/chat");
await app.listen(8080);