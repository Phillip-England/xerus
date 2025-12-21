import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";
import { Source } from "../../src/ValidationSource";
import { Validator } from "../../src/Validator";

class JsonBody {
  raw: any;
  constructor(raw: any) {
    this.raw = raw;
  }
  validate() {
    new Validator(this.raw).isObject("Expected JSON object body");
  }
}

class TextBody {
  raw: string;
  constructor(raw: any) {
    this.raw = raw;
  }
  validate() {
    new Validator(this.raw).isString("Expected text body");
  }
}

class FormBody {
  raw: Record<string, any>;
  constructor(raw: any) {
    this.raw = raw;
  }
  validate() {
    new Validator(this.raw).isObject("Expected FORM object");
  }
}

class MultipartBody {
  fd: FormData;
  constructor(raw: any) {
    this.fd = raw as FormData;
  }
  // no-op validate (parseBody enforces MULTIPART expectations)
}

export function parseBody(app: Xerus) {
  app.mount(
    new Route("POST", "/parse/json", async (c: HTTPContext, data) => {
      const body = data.get(JsonBody).raw;
      c.json({ status: "success", data: body });
    }).validate(Source.JSON(), JsonBody),

    new Route("POST", "/parse/text", async (c: HTTPContext, data) => {
      const body = data.get(TextBody).raw;
      c.json({ status: "success", data: body });
    }).validate(Source.TEXT(), TextBody),

    new Route("POST", "/parse/form", async (c: HTTPContext, data) => {
      const body = data.get(FormBody).raw;
      c.json({ status: "success", data: body });
    }).validate(Source.FORM(), FormBody),

    new Route("POST", "/parse/multipart", async (c: HTTPContext, data) => {
      const fd = data.get(MultipartBody).fd;
      const result: Record<string, string> = {};
      fd.forEach((value: FormDataEntryValue, key: string) => {
        if (typeof value === "string") result[key] = value;
      });
      c.json({ status: "success", data: result });
    }).validate(Source.MULTIPART(), MultipartBody),
  );
}
