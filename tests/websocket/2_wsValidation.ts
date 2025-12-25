import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { TestStore } from "../TestStore";
import type { HTTPContext } from "../../src/HTTPContext";
import type { TypeValidator } from "../../src/XerusValidator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import { ws } from "../../src/std/Request";

const schema = z.object({
  type: z.enum(["chat", "ping"]),
  content: z.string().min(1, "Content cannot be empty"),
});

type WSMsg = z.infer<typeof schema>;

class WSJsonValidator implements TypeValidator<WSMsg> {
  async validate(c: HTTPContext): Promise<WSMsg> {
    const raw = ws(c).message;

    if (typeof raw !== "string") {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Expected text WS message",
      );
    }

    let parsedJSON: unknown;
    try {
      parsedJSON = JSON.parse(raw);
    } catch {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid JSON");
    }

    try {
      // Return the value (Xerus stores this for c.validated(WSJsonValidator))
      return await schema.parseAsync(parsedJSON);
    } catch {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Schema validation failed",
      );
    }
  }
}

class ValidatedChat extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/validate";

  // NEW API
  services = [TestStore];
  validators = [WSJsonValidator];

  async handle(c: HTTPContext) {
    const socket = ws(c);

    // NEW API: read validated output via context
    const msg = c.validated(WSJsonValidator);

    if (msg.type === "ping") {
      socket.send("pong");
    } else {
      socket.send(`received: ${msg.content}`);
    }
  }
}

export function wsValidationMethods(app: Xerus) {
  app.mount(ValidatedChat);
}
