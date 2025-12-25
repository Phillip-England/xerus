import { z } from "zod";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import type { TypeValidator } from "../src/TypeValidator";
import { SystemErr } from "../src/SystemErr";
import { SystemErrCode } from "../src/SystemErrCode";
import { header, ws } from "../src/std/Request";
import { json } from "../src/std/Response";

let lastClose: { code: number; reason: string } = { code: 0, reason: "" };
let closeCount = 0;

const closeSchema = z.object({
  code: z.number().int().nonnegative(),
  reason: z.string(),
});

class HeaderClientValidator implements TypeValidator<string> {
  async validate(c: HTTPContext): Promise<string> {
    const client = header(c, "X-Client") ?? "";

    if (client.length === 0) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Missing X-Client header",
      );
    }
    if (client !== "tester") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Bad client header");
    }

    return client;
  }
}

class CloseEventValidator
  implements TypeValidator<{ code: number; reason: string }>
{
  async validate(c: HTTPContext): Promise<{ code: number; reason: string }> {
    const socket = ws(c);

    // zod will throw; Xerus will treat it as validation-ish via issues/errors
    const parsed = await closeSchema.parseAsync({
      code: socket.code,
      reason: socket.reason,
    });

    return parsed;
  }
}

class LifecycleOpen extends XerusRoute {
  method = Method.WS_OPEN;
  path = "/ws/lifecycle-validate";

  // NEW API
  validators = [HeaderClientValidator];

  async handle(c: HTTPContext) {
    // Access via context (if you ever need it)
    // const client = c.validated(HeaderClientValidator);

    const socket = ws(c);
    socket.send("open-ok");
  }
}

class LifecycleMessage extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/lifecycle-validate";

  async handle(c: HTTPContext) {
    const socket = ws(c);
    socket.send("cleared");
  }
}

class LifecycleClose extends XerusRoute {
  method = Method.WS_CLOSE;
  path = "/ws/close-validate";

  // NEW API
  validators = [CloseEventValidator];

  async handle(c: HTTPContext) {
    const socket = ws(c);

    // Ensures validator ran (and makes the validated value available if needed)
    // const closeInfo = c.validated(CloseEventValidator);

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
