import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";

// JSON -> TEXT should be allowed (TEXT returns raw body string)
class JsonThenText extends XerusRoute {
  method = Method.POST;
  path = "/ctx/reparse/json-then-text";
  async handle(c: HTTPContext) {
    const j = await c.parseBody(BodyType.JSON);
    const raw = await c.parseBody(BodyType.TEXT);
    c.json({ ok: true, json: j, raw });
  }
}

// JSON -> FORM should be blocked (no raw text reparse allowed per rules)
class JsonThenForm extends XerusRoute {
  method = Method.POST;
  path = "/ctx/reparse/json-then-form";
  async handle(c: HTTPContext) {
    await c.parseBody(BodyType.JSON);
    // should throw SystemErr(BODY_PARSING_FAILED)
    await c.parseBody(BodyType.FORM);
    c.json({ ok: false, shouldNot: "reach" });
  }
}

// FORM -> JSON should be blocked
class FormThenJson extends XerusRoute {
  method = Method.POST;
  path = "/ctx/reparse/form-then-json";
  async handle(c: HTTPContext) {
    await c.parseBody(BodyType.FORM);
    // should throw SystemErr(BODY_PARSING_FAILED)
    await c.parseBody(BodyType.JSON);
    c.json({ ok: false, shouldNot: "reach" });
  }
}

// MULTIPART -> JSON should be blocked (multipart consumes body)
class MultipartThenJson extends XerusRoute {
  method = Method.POST;
  path = "/ctx/reparse/multipart-then-json";
  async handle(c: HTTPContext) {
    await c.parseBody(BodyType.MULTIPART_FORM);
    // should throw SystemErr(BODY_PARSING_FAILED)
    await c.parseBody(BodyType.JSON);
    c.json({ ok: false, shouldNot: "reach" });
  }
}

// Header newline protection
class HeaderNewline extends XerusRoute {
  method = Method.GET;
  path = "/ctx/header/newline";
  async handle(c: HTTPContext) {
    // should throw SystemErr(INTERNAL_SERVER_ERR)
    c.setHeader("X-Test", "ok\r\ninjected: true");
    c.text("should not reach");
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
