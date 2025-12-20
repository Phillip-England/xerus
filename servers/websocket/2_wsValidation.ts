// PATH: /home/jacex/src/xerus/servers/websocket/2_wsValidation.ts

import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { WSRoute, WSMethod } from "../../src/WSRoute";
import { Source } from "../../src/ValidationSource";
import type { WSContext } from "../../src/WSContext";

const schema = z.object({
  type: z.enum(["chat", "ping"]),
  content: z.string().min(1, "Content cannot be empty"),
});

export function wsValidationMethods(app: Xerus) {
  app.mount(
    new WSRoute(WSMethod.MESSAGE, "/ws/validate", async (c: WSContext, data) => {
      const msg = data.get<any>("msg");
      if (msg.type === "ping") c.ws.send("pong");
      else c.ws.send(`received: ${msg.content}`);
    }).validate(Source.WS_MESSAGE(), "msg", async (_c, raw) => {
      let parsed: any;
      try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        throw new Error("Malformed JSON");
      }
      return await schema.parseAsync(parsed);
    }),
  );
}
