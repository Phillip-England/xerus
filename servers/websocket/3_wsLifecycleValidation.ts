import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { WSContext } from "../../src/WSContext";
import type { HTTPContext } from "../../src/HTTPContext";
import type { TestStore } from "../TestStore";

let lastClose: { code: number; reason: string } = { code: 0, reason: "" };
let closeCount = 0;

const closeSchema = z.object({
  code: z.number().int().nonnegative(),
  reason: z.string(),
});

class LifecycleOpen extends XerusRoute<TestStore, WSContext<TestStore>> {
  method = Method.WS_OPEN;
  path = "/ws/lifecycle-validate";

  async validate(c: WSContext<TestStore>) {
    const client = c.http.getHeader("X-Client") || "";
    if (client.length === 0) throw new Error("Missing X-Client header");
    if (client !== "tester") throw new Error("Bad client header");
  }

  async handle(c: WSContext<TestStore>) {
    c.ws.send("open-ok");
  }
}

class LifecycleMessage extends XerusRoute<TestStore, WSContext<TestStore>> {
  method = Method.WS_MESSAGE;
  path = "/ws/lifecycle-validate";

  async handle(c: WSContext<TestStore>) {
    // Validation from OPEN must not leak into MESSAGE
    c.ws.send("cleared");
  }
}

class LifecycleClose extends XerusRoute<TestStore, WSContext<TestStore>> {
  method = Method.WS_CLOSE;
  path = "/ws/close-validate";

  async validate(c: WSContext<TestStore>) {
    closeSchema.parse({ code: c.code, reason: c.reason });
  }

  async handle(c: WSContext<TestStore>) {
    lastClose = { code: c.code, reason: c.reason };
    closeCount++;
  }
}

class CloseStats extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/ws-close-stats";

  async handle(c: HTTPContext<TestStore>) {
    c.json({ closeCount, lastClose });
  }
}

export function wsLifecycleValidation(app: Xerus<TestStore>) {
  app.mount(LifecycleOpen, LifecycleMessage, LifecycleClose, CloseStats);
}
