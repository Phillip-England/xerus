import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { WSContext } from "../../src/WSContext";
import type { TestStore } from "../TestStore";

const schema = z.object({
  type: z.enum(["chat", "ping"]),
  content: z.string().min(1, "Content cannot be empty"),
});

type Msg = z.infer<typeof schema>;

class ValidatedChat extends XerusRoute<TestStore, WSContext<TestStore>> {
  method = Method.WS_MESSAGE;
  path = "/ws/validate";
  msg!: Msg;

  async validate(c: WSContext<TestStore>) {
    if (typeof c.message !== "string") {
      throw new Error("Expected text WS message");
    }

    let parsedJSON: unknown;
    try {
      parsedJSON = JSON.parse(c.message);
    } catch {
      throw new Error("Invalid JSON");
    }

    this.msg = await schema.parseAsync(parsedJSON);
  }

  async handle(c: WSContext<TestStore>) {
    if (this.msg.type === "ping") c.ws.send("pong");
    else c.ws.send(`received: ${this.msg.content}`);
  }
}

export function wsValidationMethods(app: Xerus<TestStore>) {
  app.mount(ValidatedChat);
}
