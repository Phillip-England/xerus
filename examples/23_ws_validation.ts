// PATH: /home/jacex/src/xerus/examples/23_ws_validation.ts

import { Xerus } from "../src/Xerus";
import { WSRoute, WSMethod } from "../src/WSRoute";
import { Source } from "../src/ValidationSource";
import { z } from "zod";
import type { TypeValidator } from "../src/TypeValidator";
import type { WSContext } from "../src/WSContext";

class ChatMessage implements TypeValidator {
  static schema = z.object({
    type: z.literal("chat"),
    text: z.string().min(1),
    timestamp: z.number().optional(),
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

const app = new Xerus();

app.mount(
  new WSRoute(WSMethod.MESSAGE, "/ws/channel", async (c: WSContext, data) => {
    const msg = data.get(ChatMessage); // ✅ from data object
    console.log(`Received: ${msg.text} at ${msg.timestamp}`);
    c.ws.send(`Echo: ${msg.text}`);
  }).validate(ChatMessage, Source.WS_MESSAGE),
);

console.log('Connect to ws://localhost:8080/ws/channel and send JSON: { "type":"chat","text":"Hello" }');
await app.listen(8080);
