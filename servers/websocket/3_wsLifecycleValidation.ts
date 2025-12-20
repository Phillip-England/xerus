// PATH: /home/jacex/src/xerus/servers/websocket/3_wsLifecycleValidation.ts

import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { WSRoute, WSMethod } from "../../src/WSRoute";
import { Route } from "../../src/Route";
import { Source } from "../../src/ValidationSource";
import type { WSContext } from "../../src/WSContext";
import type { HTTPContext } from "../../src/HTTPContext";

let lastClose: { code: number; reason: string } = { code: 0, reason: "" };
let closeCount = 0;

export function wsLifecycleValidation(app: Xerus) {
  app.mount(
    // OPEN validates a header, then sends "open-ok"
    new WSRoute(WSMethod.OPEN, "/ws/lifecycle-validate", async (c: WSContext, data) => {
      data.get<string>("client");
      c.ws.send("open-ok");
    }).validate(Source.HEADER("X-Client"), "client", async (_c, raw) => {
      const v = String(raw ?? "");
      z.string().min(1).parse(v);
      if (v !== "tester") throw new Error("Bad client header");
      return v;
    }),

    // MESSAGE should NOT see OPEN validator anymore (validated cleared per event)
    new WSRoute(WSMethod.MESSAGE, "/ws/lifecycle-validate", async (c: WSContext, data) => {
      const leaked = data.maybe<string>("client");
      c.ws.send(leaked ? "leak" : "cleared");
    }),

    // CLOSE validates close args via Source.WS_CLOSE()
    new WSRoute(WSMethod.CLOSE, "/ws/close-validate", async (_c: WSContext, data) => {
      const info = data.get<{ code: number; reason: string }>("close");
      lastClose = { code: info.code, reason: info.reason };
      closeCount++;
    }).validate(Source.WS_CLOSE(), "close", async (_c, raw) => {
      const obj = raw ?? { code: 0, reason: "" };
      const parsed = z.object({
        code: z.number().int().nonnegative(),
        reason: z.string(),
      }).parse(obj);
      return parsed;
    }),

    // HTTP observability for tests
    new Route("GET", "/ws-close-stats", async (c: HTTPContext) => {
      c.json({ closeCount, lastClose });
    }),
  );
}
