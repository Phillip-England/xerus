import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";

class JsonBody implements TypeValidator {
  data: any;
  constructor(raw: any) {
    this.data = raw;
  }
  async validate(c: HTTPContext) {
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
  // No constructor needed for Ctx validators, or it receives undefined
  async validate(c: HTTPContext) {
    this.content = await c.parseBody(BodyType.TEXT);
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
  constructor(raw: any) {
    this.data = raw;
  }
  async validate(c: HTTPContext) {
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
    this.fd = await c.parseBody(BodyType.MULTIPART_FORM);
  }
}

class ParseJson extends XerusRoute {
  method = Method.POST;
  path = "/parse/json";
  body = Validator.Param(Source.JSON(), JsonBody);
  async handle(c: HTTPContext) {
    c.json({ status: "success", data: this.body.data });
  }
}

class ParseText extends XerusRoute {
  method = Method.POST;
  path = "/parse/text";
  // Updated to use Ctx instead of Source.CUSTOM
  body = Validator.Ctx(TextBody);
  async handle(c: HTTPContext) {
    c.json({ status: "success", data: this.body.content });
  }
}

class ParseForm extends XerusRoute {
  method = Method.POST;
  path = "/parse/form";
  body = Validator.Param(Source.FORM(), FormBody);
  async handle(c: HTTPContext) {
    c.json({ status: "success", data: this.body.data });
  }
}

class ParseMultipart extends XerusRoute {
  method = Method.POST;
  path = "/parse/multipart";
  // Updated to use Ctx instead of Source.CUSTOM
  body = Validator.Ctx(MultipartBody);
  async handle(c: HTTPContext) {
    const result: Record<string, string> = {};
    this.body.fd.forEach((value: FormDataEntryValue, key: string) => {
      if (typeof value === "string") result[key] = value;
    });
    c.json({ status: "success", data: result });
  }
}

export function parseBody(app: Xerus) {
  app.mount(ParseJson, ParseText, ParseForm, ParseMultipart);
}