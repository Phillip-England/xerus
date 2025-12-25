import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import type { TypeValidator } from "../../src/XerusValidator";
import { json } from "../../src/std/Response";
import { parseBody as stdParseBody } from "../../src/std/Body";

class JsonBody implements TypeValidator {
  async validate(c: HTTPContext) {
    const data: any = await stdParseBody(c, BodyType.JSON);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Expected JSON object body",
      );
    }
    return data;
  }
}

class TextBody implements TypeValidator {
  async validate(c: HTTPContext) {
    const content = await stdParseBody(c, BodyType.TEXT);
    if (typeof content !== "string") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Expected text body");
    }
    return content;
  }
}

class FormBody implements TypeValidator {
  async validate(c: HTTPContext) {
    const data: any = await stdParseBody(c, BodyType.FORM);
    if (!data || typeof data !== "object") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Expected FORM object");
    }
    return data;
  }
}

class MultipartBody implements TypeValidator {
  async validate(c: HTTPContext) {
    const fd = await stdParseBody(c, BodyType.MULTIPART_FORM);
    return fd;
  }
}

class ParseJson extends XerusRoute {
  method = Method.POST;
  path = "/parse/json";
  validators = [JsonBody];

  async handle(c: HTTPContext) {
    const data = c.validated(JsonBody);
    json(c, { status: "success", data });
  }
}

class ParseText extends XerusRoute {
  method = Method.POST;
  path = "/parse/text";
  validators = [TextBody];

  async handle(c: HTTPContext) {
    const data = c.validated(TextBody);
    json(c, { status: "success", data });
  }
}

class ParseForm extends XerusRoute {
  method = Method.POST;
  path = "/parse/form";
  validators = [FormBody];

  async handle(c: HTTPContext) {
    const data = c.validated(FormBody);
    json(c, { status: "success", data });
  }
}

class ParseMultipart extends XerusRoute {
  method = Method.POST;
  path = "/parse/multipart";
  validators = [MultipartBody];

  async handle(c: HTTPContext) {
    const fd = c.validated(MultipartBody) as FormData;
    const result: Record<string, string> = {};
    fd.forEach((value: FormDataEntryValue, key: string) => {
      if (typeof value === "string") result[key] = value;
    });
    json(c, { status: "success", data: result });
  }
}

export function parseBody(c: HTTPContext, JSON: BodyType, app: Xerus) {
  app.mount(ParseJson, ParseText, ParseForm, ParseMultipart);
}
