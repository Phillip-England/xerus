import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { TestStore } from "../TestStore";
import type { TypeValidator } from "../../src/TypeValidator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import type { HTTPContext } from "../../src/HTTPContext";
import { ws } from "../../src/std/Request";

export class ChatMessageValidator implements TypeValidator<string> {
  async validate(c: HTTPContext): Promise<string> {
    const content = String(ws(c).message);

    if (content.includes("badword")) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Profanity detected",
      );
    }

    // NEW API: validators must return the validated value
    return content;
  }
}

class ValidatorWsRoute extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/validator";

  // NEW API
  services = [TestStore];
  validators = [ChatMessageValidator];

  async handle(c: HTTPContext) {
    const socket = ws(c);

    // NEW API: read validated output via context
    const content = c.validated(ChatMessageValidator);

    socket.send(`clean: ${content}`);
  }
}

export function wsValidator(app: Xerus) {
  app.mount(ValidatorWsRoute);
}
