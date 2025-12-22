import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { Validator } from "../../src/Validator";
import { Inject } from "../../src/RouteFields";
import { TestStore } from "../TestStore";
import type { HTTPContext } from "../../src/HTTPContext";
import type { TypeValidator } from "../../src/TypeValidator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";

const schema = z.object({
  type: z.enum(["chat", "ping"]),
  content: z.string().min(1, "Content cannot be empty"),
});

class WSJsonValidator implements TypeValidator {
  data!: z.infer<typeof schema>;
  async validate(c: HTTPContext) {
    const raw = c.ws().message;
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
      this.data = await schema.parseAsync(parsedJSON);
    } catch (e) {
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
  store = Inject(TestStore);
  msg = Validator.Ctx(WSJsonValidator);

  async handle(c: HTTPContext) {
    let ws = c.ws();
    if (this.msg.data.type === "ping") {
      ws.send("pong");
    } else {
      ws.send(`received: ${this.msg.data.content}`);
    }
  }
}

export function wsValidationMethods(app: Xerus) {
  app.mount(ValidatedChat);
}