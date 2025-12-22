import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
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

// 1. Create a TypeValidator to handle the parsing
class WSJsonValidator implements TypeValidator {
  raw: any;
  data!: z.infer<typeof schema>;

  constructor(raw: any) {
    this.raw = raw;
  }

  async validate(c: HTTPContext) {
    if (typeof this.raw !== "string") {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Expected text WS message",
      );
    }
    let parsedJSON: unknown;
    try {
      parsedJSON = JSON.parse(this.raw);
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

  // 2. Inject the validator using the WSMESSAGE source
  msg = Validator.Param(Source.WSMESSAGE(), WSJsonValidator);

  async handle(c: HTTPContext) {
    let ws = c.ws();
    // 3. Access the parsed data via the injected property
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