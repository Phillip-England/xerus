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

class LifecycleOpen extends XerusRoute<HTTPContext<TestStore>> {
  method = Method.WS_OPEN;
  path = "/ws/lifecycle-validate";

  async validate(c: HTTPContext<TestStore>) {
    const client = c.getHeader("X-Client") || "";
    if (client.length === 0) throw new Error("Missing X-Client header");
    if (client !== "tester") throw new Error("Bad client header");
  }

  async handle(c: HTTPContext<TestStore>) {
    let ws = c.ws()
    ws.send("open-ok");
  }
}

class LifecycleMessage extends XerusRoute<HTTPContext<TestStore>> {
  method = Method.WS_MESSAGE;
  path = "/ws/lifecycle-validate";

  async handle(c: HTTPContext<TestStore>) {
    let ws = c.ws()
    // Validation from OPEN must not leak into MESSAGE
    ws.send("cleared");
  }
}

class LifecycleClose extends XerusRoute<HTTPContext<TestStore>> {
  method = Method.WS_CLOSE;
  path = "/ws/close-validate";

  async validate(c: HTTPContext<TestStore>) {
    let ws = c.ws()
    closeSchema.parse({ code:ws.code, reason:ws.reason });
  }

  async handle(c: HTTPContext<TestStore>) {
    let ws = c.ws()
    lastClose = { code:ws.code, reason:ws.reason };
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
