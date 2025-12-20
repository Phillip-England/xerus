import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { WSRoute } from "../../src/WSRoute";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";

// 1. Define the Message Structure
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
  const wsValRoute = new WSRoute("/ws/validate");

  wsValRoute.message(
    async (ws, raw) => {
      const msg = ws.data.getValid(ChatMessage);

      if (msg.type === "ping") {
        ws.send("pong");
      } else {
        ws.send(`received: ${msg.content}`);
      }
    },
    Validator(ChatMessage, Source.WS_MESSAGE)
  );

  app.mount(wsValRoute);
}