import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { WSRoute, WSMethod } from "../../src/WSRoute";
import { Route } from "../../src/Route";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";
import type { WSContext } from "../../src/WSContext";
import type { HTTPContext } from "../../src/HTTPContext";

// -----------------------------
// Validators
// -----------------------------

class ClientHeader implements TypeValidator {
  client: string;

  constructor(d: any) {
    this.client = d?.["X-Client"] ?? "";
  }

  validate() {
    z.object({ client: z.string().min(1) }).parse(this);
    if (this.client !== "tester") throw new Error("Bad client header");
  }
}

class CloseInfo implements TypeValidator {
  code: number;
  reason: string;

  constructor(d: any) {
    this.code = d?.code ?? 0;
    this.reason = d?.reason ?? "";
  }

  validate() {
    z.object({
      code: z.number().int().nonnegative(),
      reason: z.string(),
    }).parse(this);
  }
}

// -----------------------------
// Routes
// -----------------------------

let lastClose: { code: number; reason: string } = { code: 0, reason: "" };
let closeCount = 0;

export function wsLifecycleValidation(app: Xerus) {
  // OPEN validates a header, then sends "open-ok"
  app.mount(
    new WSRoute(WSMethod.OPEN, "/ws/lifecycle-validate", async (c: WSContext, data) => {
      // Must exist in OPEN
      data.get(ClientHeader);
      c.ws.send("open-ok");
    }).validate(ClientHeader, Source.HEADER("X-Client")),

    // MESSAGE should NOT see OPEN validator anymore (validated cleared per event)
    new WSRoute(WSMethod.MESSAGE, "/ws/lifecycle-validate", async (c: WSContext, data) => {
      const leaked = data.maybe(ClientHeader);
      c.ws.send(leaked ? "leak" : "cleared");
    }),

    // CLOSE validates close args via Source.WS_CLOSE
    new WSRoute(WSMethod.CLOSE, "/ws/close-validate", async (_c: WSContext, data) => {
      const info = data.get(CloseInfo);
      lastClose = { code: info.code, reason: info.reason };
      closeCount++;
    }).validate(CloseInfo, Source.WS_CLOSE),

    // HTTP observability for tests
    new Route("GET", "/ws-close-stats", async (c: HTTPContext) => {
      c.json({ closeCount, lastClose });
    }),
  );
}
