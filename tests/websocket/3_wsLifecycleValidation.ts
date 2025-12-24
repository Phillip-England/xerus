import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import type { TestStore } from "../TestStore";
import type { TypeValidator } from "../../src/TypeValidator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import { header, ws } from "../../src/std/Request";
import { json } from "../../src/std/Response";
import { Validator } from "../../src/Validator";

let lastClose: { code: number; reason: string } = { code: 0, reason: "" };
let closeCount = 0;

const closeSchema = z.object({
  code: z.number().int().nonnegative(),
  reason: z.string(),
});

class HeaderClientValidator implements TypeValidator {
  client!: string;
  async validate(c: HTTPContext) {
    this.client = header(c, "X-Client") ?? "";

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
    let socket = ws(c);
    await closeSchema.parseAsync({ code: socket.code, reason: socket.reason });
  }
}

class LifecycleOpen extends XerusRoute {
  method = Method.WS_OPEN;
  path = "/ws/lifecycle-validate";
  headers = Validator.Ctx(HeaderClientValidator);
  async handle(c: HTTPContext) {
    let socket = ws(c);
    socket.send("open-ok");
  }
}

class LifecycleMessage extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/lifecycle-validate";
  async handle(c: HTTPContext) {
    let socket = ws(c);
    socket.send("cleared");
  }
}

class LifecycleClose extends XerusRoute {
  method = Method.WS_CLOSE;
  path = "/ws/close-validate";
  closer = Validator.Ctx(CloseEventValidator);
  async handle(c: HTTPContext) {
    let socket = ws(c);
    lastClose = { code: socket.code, reason: socket.reason };
    closeCount++;
  }
}

class CloseStats extends XerusRoute {
  method = Method.GET;
  path = "/ws-close-stats";
  async handle(c: HTTPContext) {
    json(c, { closeCount, lastClose });
  }
}

export function wsLifecycleValidation(app: Xerus) {
  app.mount(LifecycleOpen, LifecycleMessage, LifecycleClose, CloseStats);
}