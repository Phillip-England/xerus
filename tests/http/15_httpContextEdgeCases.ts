import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { parseBody } from "../../src/std/Body";
import { json, setHeader, text } from "../../src/std/Response";

class JsonThenText extends XerusRoute {
  method = Method.POST;
  path = "/ctx/reparse/json-then-text";
  async handle(c: HTTPContext) {
    const j = await parseBody(c, BodyType.JSON);
    const raw = await parseBody(c, BodyType.TEXT);
    json(c, { ok: true, json: j, raw });
  }
}

class JsonThenForm extends XerusRoute {
  method = Method.POST;
  path = "/ctx/reparse/json-then-form";
  async handle(c: HTTPContext) {
    await parseBody(c, BodyType.JSON);
    await parseBody(c, BodyType.FORM);
    json(c, { ok: false, shouldNot: "reach" });
  }
}

class FormThenJson extends XerusRoute {
  method = Method.POST;
  path = "/ctx/reparse/form-then-json";
  async handle(c: HTTPContext) {
    await parseBody(c, BodyType.FORM);
    await parseBody(c, BodyType.JSON);
    json(c, { ok: false, shouldNot: "reach" });
  }
}

class MultipartThenJson extends XerusRoute {
  method = Method.POST;
  path = "/ctx/reparse/multipart-then-json";
  async handle(c: HTTPContext) {
    await parseBody(c, BodyType.MULTIPART_FORM);
    await parseBody(c, BodyType.JSON);
    json(c, { ok: false, shouldNot: "reach" });
  }
}

class HeaderNewline extends XerusRoute {
  method = Method.GET;
  path = "/ctx/header/newline";
  async handle(c: HTTPContext) {
    setHeader(c, "X-Test", "ok\r\ninjected: true");
    text(c, "should not reach");
  }
}

export function httpContextEdgeCases(app: Xerus) {
  app.mount(
    JsonThenText,
    JsonThenForm,
    FormThenJson,
    MultipartThenJson,
    HeaderNewline,
  );
}
