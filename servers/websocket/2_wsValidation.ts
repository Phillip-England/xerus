// PATH: /home/jacex/src/xerus/servers/websocket/2_wsValidation.ts
import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { WSRoute, WSMethod } from "../../src/WSRoute";
import { Source } from "../../src/ValidationSource";
import type { WSContext } from "../../src/WSContext";
import type { TypeValidator } from "../../src/TypeValidator";

const schema = z.object({
  type: z.enum(["chat", "ping"]),
  content: z.string().min(1, "Content cannot be empty"),
});

type Msg = z.infer<typeof schema>;

class WSValidatedMsg implements TypeValidator<WSContext> {
  raw: string;
  msg!: Msg;

  constructor(raw: any) {
    // WS_MESSAGE comes in as string (WSHandler converts Buffer -> string)
    if (typeof raw !== "string") {
      throw new Error("Expected text WS message");
    }
    this.raw = raw;
  }

  async validate(_c: WSContext) {
    let parsedJSON: any;
    try {
      parsedJSON = JSON.parse(this.raw);
    } catch {
      throw new Error("Invalid JSON");
    }

    this.msg = await schema.parseAsync(parsedJSON);
  }
}

export function wsValidationMethods(app: Xerus) {
  app.mount(
    new WSRoute(WSMethod.MESSAGE, "/ws/validate", async (c: WSContext, data) => {
      const msg = data.get(WSValidatedMsg).msg;

      if (msg.type === "ping") c.ws.send("pong");
      else c.ws.send(`received: ${msg.content}`);
    }).validate(Source.WS_MESSAGE(), WSValidatedMsg),
  );
}
