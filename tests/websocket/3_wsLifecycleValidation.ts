import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { Validator } from "../../src/Validator";
import type { HTTPContext } from "../../src/HTTPContext";
import type { TestStore } from "../TestStore";
import type { TypeValidator } from "../../src/TypeValidator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";

let lastClose: { code: number; reason: string } = { code: 0, reason: "" };
let closeCount = 0;

const closeSchema = z.object({
  code: z.number().int().nonnegative(),
  reason: z.string(),
});

class HeaderClientValidator implements TypeValidator {
  client!: string;
  async validate(c: HTTPContext) {
    this.client = c.getHeader("X-Client") ?? "";
    if (this.client.length === 0) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Missing X-Client header",
      );
    }
    if (this.client !== "tester") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Bad client header");
    }
  }
}

class CloseEventValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    let ws = c.ws();
    await closeSchema.parseAsync({ code: ws.code, reason: ws.reason });
  }
}

class LifecycleOpen extends XerusRoute {
  method = Method.WS_OPEN;
  path = "/ws/lifecycle-validate";
  headers = Validator.Ctx(HeaderClientValidator);
  async handle(c: HTTPContext) {
    let ws = c.ws();
    ws.send("open-ok");
  }
}

class LifecycleMessage extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/lifecycle-validate";
  async handle(c: HTTPContext) {
    let ws = c.ws();
    ws.send("cleared");
  }
}

class LifecycleClose extends XerusRoute {
  method = Method.WS_CLOSE;
  path = "/ws/close-validate";
  closer = Validator.Ctx(CloseEventValidator);
  async handle(c: HTTPContext) {
    let ws = c.ws();
    lastClose = { code: ws.code, reason: ws.reason };
    closeCount++;
  }
}

class CloseStats extends XerusRoute {
  method = Method.GET;
  path = "/ws-close-stats";
  async handle(c: HTTPContext) {
    c.json({ closeCount, lastClose });
  }
}

export function wsLifecycleValidation(app: Xerus) {
  app.mount(LifecycleOpen, LifecycleMessage, LifecycleClose, CloseStats);
}