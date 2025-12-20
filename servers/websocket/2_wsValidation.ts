// PATH: /home/jacex/src/xerus/servers/websocket/2_wsValidation.ts

import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { WSRoute, WSMethod } from "../../src/WSRoute";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";
import type { WSContext } from "../../src/WSContext";

class ChatMessage implements TypeValidator {
  type: "chat" | "ping";
  content: string;

  constructor(data: any) {
    this.type = data?.type;
    this.content = data?.content;
  }

  async validate() {
    const schema = z.object({
      type: z.enum(["chat", "ping"]),
      content: z.string().min(1, "Content cannot be empty"),
    });
    await schema.parseAsync(this);
  }
}

export function wsValidationMethods(app: Xerus) {
  app.mount(
    new WSRoute(WSMethod.MESSAGE, "/ws/validate", async (c: WSContext, data) => {
      const msg = data.get(ChatMessage); // ✅ from data object
      if (msg.type === "ping") c.ws.send("pong");
      else c.ws.send(`received: ${msg.content}`);
    }).validate(ChatMessage, Source.WS_MESSAGE),
  );
}
