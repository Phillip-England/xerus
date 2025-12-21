import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";

class ParseJson extends XerusRoute {
  method = Method.POST;
  path = "/parse/json";
  body: any;

  async validate(c: HTTPContext) {
    this.body = await c.parseBody(BodyType.JSON);
    if (!this.body || typeof this.body !== "object" || Array.isArray(this.body)) {
        throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Expected JSON object body");
    }
  }

  async handle(c: HTTPContext) {
    c.json({ status: "success", data: this.body });
  }
}

class ParseText extends XerusRoute {
  method = Method.POST;
  path = "/parse/text";
  body: string = "";

  async validate(c: HTTPContext) {
    this.body = await c.parseBody(BodyType.TEXT);
    if (typeof this.body !== "string") {
        throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Expected text body");
    }
  }

  async handle(c: HTTPContext) {
    c.json({ status: "success", data: this.body });
  }
}

class ParseForm extends XerusRoute {
  method = Method.POST;
  path = "/parse/form";
  body: any;

  async validate(c: HTTPContext) {
    this.body = await c.parseBody(BodyType.FORM);
    if (!this.body || typeof this.body !== "object" || Array.isArray(this.body)) {
        throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Expected FORM object");
    }
  }

  async handle(c: HTTPContext) {
    c.json({ status: "success", data: this.body });
  }
}

class ParseMultipart extends XerusRoute {
  method = Method.POST;
  path = "/parse/multipart";
  fd!: FormData;

  async validate(c: HTTPContext) {
    this.fd = await c.parseBody(BodyType.MULTIPART_FORM);
  }

  async handle(c: HTTPContext) {
    const result: Record<string, string> = {};
    this.fd.forEach((value: FormDataEntryValue, key: string) => {
      if (typeof value === "string") result[key] = value;
    });
    c.json({ status: "success", data: result });
  }
}

export function parseBody(app: Xerus) {
  app.mount(ParseJson, ParseText, ParseForm, ParseMultipart);
}