import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import type { TypeValidator } from "../../src/TypeValidator";
import { json } from "../../src/std/Response";
// Alias the import to avoid conflict with the exported function below
import { parseBody as stdParseBody } from "../../src/std/Body";
import { Validator } from "../../src/Validator";

class JsonBody implements TypeValidator {
  data: any;
  async validate(c: HTTPContext) {
    this.data = await stdParseBody(c, BodyType.JSON);
    if (
      !this.data || typeof this.data !== "object" || Array.isArray(this.data)
    ) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Expected JSON object body",
      );
    }
  }
}

class TextBody implements TypeValidator {
  content!: string;
  async validate(c: HTTPContext) {
    this.content = await stdParseBody(c, BodyType.TEXT);
    if (typeof this.content !== "string") {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Expected text body",
      );
    }
  }
}

class FormBody implements TypeValidator {
  data: any;
  async validate(c: HTTPContext) {
    this.data = await stdParseBody(c, BodyType.FORM);
    if (!this.data || typeof this.data !== "object") {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Expected FORM object",
      );
    }
  }
}

class MultipartBody implements TypeValidator {
  fd!: FormData;
  async validate(c: HTTPContext) {
    this.fd = await stdParseBody(c, BodyType.MULTIPART_FORM);
  }
}

class ParseJson extends XerusRoute {
  method = Method.POST;
  path = "/parse/json";
  body = Validator.Ctx(JsonBody);
  async handle(c: HTTPContext) {
    json(c, { status: "success", data: this.body.data });
  }
}

class ParseText extends XerusRoute {
  method = Method.POST;
  path = "/parse/text";
  body = Validator.Ctx(TextBody);
  async handle(c: HTTPContext) {
    json(c, { status: "success", data: this.body.content });
  }
}

class ParseForm extends XerusRoute {
  method = Method.POST;
  path = "/parse/form";
  body = Validator.Ctx(FormBody);
  async handle(c: HTTPContext) {
    json(c, { status: "success", data: this.body.data });
  }
}

class ParseMultipart extends XerusRoute {
  method = Method.POST;
  path = "/parse/multipart";
  body = Validator.Ctx(MultipartBody);
  async handle(c: HTTPContext) {
    const result: Record<string, string> = {};
    this.body.fd.forEach((value: FormDataEntryValue, key: string) => {
      if (typeof value === "string") result[key] = value;
    });
    json(c, { status: "success", data: result });
  }
}

export function parseBody(app: Xerus) {
  app.mount(ParseJson, ParseText, ParseForm, ParseMultipart);
}