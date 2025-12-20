import { Xerus } from "../src/Xerus";
import { Validator } from "../src/Validator";
import { Source } from "../src/ValidationSource";
import { z } from "zod";

const app = new Xerus();
const ws = app.group("/ws");

// 1. Define your Message Structure
class ChatMessage {
  static schema = z.object({
    type: z.literal("chat"),
    text: z.string().min(1),
    timestamp: z.number().optional()
  });

  public text: string;
  public timestamp: number;

  constructor(data: any) {
    this.text = data.text;
    this.timestamp = data.timestamp || Date.now();
  }

  validate() {
    ChatMessage.schema.parse(this);
  }
}

// 2. Register with Source.WS_MESSAGE
ws.message(
  "/channel", 
  async (ws, raw) => {
    // 3. Ergonomic Retrieval
    // No parsing needed here, Validator handled it.
    // 'msg' is fully typed as ChatMessage
    const msg = ws.data.getValid(ChatMessage);
    
    console.log(`Received: ${msg.text} at ${msg.timestamp}`);
    ws.send(`Echo: ${msg.text}`);
  },
  Validator(ChatMessage, Source.WS_MESSAGE)
);

console.log("Connect to ws://localhost:8080/ws/channel and send JSON: { \"type\": \"chat\", \"text\": \"Hello\" }");
await app.listen(8080);