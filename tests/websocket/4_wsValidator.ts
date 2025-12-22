import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { Validator } from "../../src/Validator";
import { Inject } from "../../src/RouteFields";
import { TestStore } from "../TestStore";
import type { TypeValidator } from "../../src/TypeValidator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import { HTTPContext } from "../../src/HTTPContext";

export class ChatMessageValidator implements TypeValidator {
  content!: string;
  async validate(c: HTTPContext) {
    this.content = String(c.ws().message);
    if (this.content.includes("badword")) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Profanity detected",
      );
    }
  }
}

class ValidatorWsRoute extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/validator";
  store = Inject(TestStore);
  msg = Validator.Ctx(ChatMessageValidator);

  async handle(c: HTTPContext) {
    let ws = c.ws();
    ws.send(`clean: ${this.msg.content}`);
  }
}

export function wsValidator(app: Xerus) {
  app.mount(ValidatorWsRoute);
}
