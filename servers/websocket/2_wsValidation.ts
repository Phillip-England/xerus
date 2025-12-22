import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { WSContext } from "../../src/WSContext";
import type { TestStore } from "../TestStore";
import type { HTTPContext } from "../../src/HTTPContext";

const schema = z.object({
  type: z.enum(["chat", "ping"]),
  content: z.string().min(1, "Content cannot be empty"),
});

type Msg = z.infer<typeof schema>;

class ValidatedChat extends XerusRoute<HTTPContext<TestStore>> {
  method = Method.WS_MESSAGE;
  path = "/ws/validate";
  msg!: Msg;

  async validate(c: HTTPContext<TestStore>) {
    let ws = c.ws()
    if (typeof ws.message !== "string") {
      throw new Error("Expected text WS message");
    }

    let parsedJSON: unknown;
    try {
      parsedJSON = JSON.parse(ws.message);
    } catch {
      throw new Error("Invalid JSON");
    }

    this.msg = await schema.parseAsync(parsedJSON);
  }

  async handle(c: HTTPContext<TestStore>) {
    let ws = c.ws()
    if (this.msg.type === "ping") ws.send("pong");
    else ws.send(`received: ${this.msg.content}`);
  }
}

export function wsValidationMethods(app: Xerus<TestStore>) {
  app.mount(ValidatedChat);
}
