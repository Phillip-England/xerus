// PATH: /home/jacex/src/xerus/servers/websocket/3_wsLifecycleValidation.ts
import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { WSRoute, WSMethod } from "../../src/WSRoute";
import { Route } from "../../src/Route";
import { Source } from "../../src/ValidationSource";
import type { WSContext } from "../../src/WSContext";
import type { HTTPContext } from "../../src/HTTPContext";
import type { TypeValidator } from "../../src/TypeValidator";

let lastClose: { code: number; reason: string } = { code: 0, reason: "" };
let closeCount = 0;

const closeSchema = z.object({
  code: z.number().int().nonnegative(),
  reason: z.string(),
});
type CloseInfo = z.infer<typeof closeSchema>;

class ClientHeader implements TypeValidator<WSContext> {
  client: string;

  constructor(raw: any) {
    this.client = String(raw ?? "");
  }

  async validate(_c: WSContext) {
    if (this.client.length === 0) throw new Error("Missing X-Client header");
    if (this.client !== "tester") throw new Error("Bad client header");
  }
}

class ClosePayload implements TypeValidator<WSContext> {
  info!: CloseInfo;

  constructor(raw: any) {
    // raw is { code, reason } from Source.WS_CLOSE()
    this.info = raw as any;
  }

  async validate(_c: WSContext) {
    this.info = closeSchema.parse(this.info ?? { code: 0, reason: "" });
  }
}

export function wsLifecycleValidation(app: Xerus) {
  app.mount(
    new WSRoute(WSMethod.OPEN, "/ws/lifecycle-validate", async (c: WSContext, data) => {
      // Ensure header validated and present for this event
      data.get(ClientHeader);
      c.ws.send("open-ok");
    }).validate(Source.HEADER("X-Client"), ClientHeader),

    new WSRoute(WSMethod.MESSAGE, "/ws/lifecycle-validate", async (c: WSContext, data) => {
      // ValidatedData is cleared per WS event; this should be undefined if no leak
      const leaked = data.maybe<ClientHeader>(ClientHeader);
      c.ws.send(leaked ? "leak" : "cleared");
    }),

    new WSRoute(WSMethod.CLOSE, "/ws/close-validate", async (_c: WSContext, data) => {
      const info = data.get(ClosePayload).info;
      lastClose = { code: info.code, reason: info.reason };
      closeCount++;
    }).validate(Source.WS_CLOSE(), ClosePayload),

    new Route("GET", "/ws-close-stats", async (c: HTTPContext) => {
      c.json({ closeCount, lastClose });
    }),
  );
}
