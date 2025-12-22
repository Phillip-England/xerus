import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { WSContext } from "../../src/WSContext";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import { HTTPContext } from "../../src/HTTPContext"; // For type reference in TypeValidator

export class ChatMessageValidator implements TypeValidator {
  content: string;

  constructor(raw: any) {
    // raw is the string/buffer message from WS
    this.content = String(raw);
  }

  async validate(c: HTTPContext) {
    if (this.content.includes("badword")) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Profanity detected");
    }
  }
}

class ValidatorWsRoute extends XerusRoute<HTTPContext> {
  method = Method.WS_MESSAGE;
  path = "/ws/validator";

  validators = [
    Validator.from(Source.WSMESSAGE(), ChatMessageValidator)
  ];

  async handle(c: HTTPContext) {
    let ws = c.ws()
    // Resolve works on the underlying HTTPContext
    const msg = c.resolve(ChatMessageValidator);
    ws.send(`clean: ${msg.content}`);
  }
}

export function wsValidator(app: Xerus) {
  app.mount(ValidatorWsRoute);
}