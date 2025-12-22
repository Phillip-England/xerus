import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
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

// Validator for Headers (used in WS Open)
class HeaderClientValidator implements TypeValidator {
  client: string;
  constructor(raw: any) {
    this.client = raw || "";
  }
  async validate(c: HTTPContext) {
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

// Validator for Close Event (uses c.ws())
class CloseEventValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    let ws = c.ws();
    // Validate that the close code/reason match expectations
    await closeSchema.parseAsync({ code: ws.code, reason: ws.reason });
  }
}

class LifecycleOpen extends XerusRoute<HTTPContext<TestStore>> {
  method = Method.WS_OPEN;
  path = "/ws/lifecycle-validate";

  // Validate headers using Source.CUSTOM
  headers = Validator.Param(
    Source.CUSTOM((c) => c.getHeader("X-Client")),
    HeaderClientValidator,
  );

  async handle(c: HTTPContext<TestStore>) {
    let ws = c.ws();
    ws.send("open-ok");
  }
}

class LifecycleMessage extends XerusRoute<HTTPContext<TestStore>> {
  method = Method.WS_MESSAGE;
  path = "/ws/lifecycle-validate";
  async handle(c: HTTPContext<TestStore>) {
    let ws = c.ws();
    ws.send("cleared");
  }
}

class LifecycleClose extends XerusRoute<HTTPContext<TestStore>> {
  method = Method.WS_CLOSE;
  path = "/ws/close-validate";

  // Validate close frame data.
  // We use Source.CUSTOM to just trigger the validator; the validator accesses c.ws() internally.
  closer = Validator.Param(Source.CUSTOM(() => true), CloseEventValidator);

  async handle(c: HTTPContext<TestStore>) {
    let ws = c.ws();
    lastClose = { code: ws.code, reason: ws.reason };
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
