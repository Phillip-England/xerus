import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { WSContext } from "../src/WSContext";

type Store = Record<string, any>;

const app = new Xerus<Store>();

type ChatMessage = { type: "chat"; text: string };

class ValidatedChat extends XerusRoute<Store, WSContext<Store>> {
  method = Method.WS_MESSAGE;
  path = "/ws/channel";

  private msg!: ChatMessage;

  async validate(c: WSContext<Store>) {
    // 1. Ensure message is text
    if (typeof c.message !== "string") {
      throw new Error("Binary messages not supported");
    }

    // 2. Parse JSON
    let raw: any;
    try {
      raw = JSON.parse(c.message);
    } catch {
      throw new Error("Invalid JSON");
    }

    // 3. Validate schema
    if (raw.type !== "chat") throw new Error("Invalid type");
    if (typeof raw.text !== "string" || raw.text.length === 0) throw new Error("Text required");

    this.msg = raw;
  }

  async handle(c: WSContext<Store>) {
    console.log(`Received: ${this.msg.text}`);
    c.ws.send(`Echo: ${this.msg.text}`);
  }
}

app.mount(ValidatedChat);

console.log('Connect to ws://localhost:8080/ws/channel and send {"type":"chat","text":"Hello"}');
await app.listen(8080);
