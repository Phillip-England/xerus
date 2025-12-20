import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";

export function httpContextEdgeCases(app: Xerus) {
  app.mount(
    // JSON -> TEXT should be allowed (TEXT returns raw body string)
    new Route("POST", "/ctx/reparse/json-then-text", async (c: HTTPContext) => {
      const j = await c.parseBody(BodyType.JSON);
      const raw = await c.parseBody(BodyType.TEXT);
      c.json({ ok: true, json: j, raw });
    }),

    // JSON -> FORM should be blocked (no raw text reparse allowed per rules)
    new Route("POST", "/ctx/reparse/json-then-form", async (c: HTTPContext) => {
      await c.parseBody(BodyType.JSON);
      // should throw SystemErr(BODY_PARSING_FAILED)
      await c.parseBody(BodyType.FORM);
      c.json({ ok: false, shouldNot: "reach" });
    }),

    // FORM -> JSON should be blocked
    new Route("POST", "/ctx/reparse/form-then-json", async (c: HTTPContext) => {
      await c.parseBody(BodyType.FORM);
      // should throw SystemErr(BODY_PARSING_FAILED)
      await c.parseBody(BodyType.JSON);
      c.json({ ok: false, shouldNot: "reach" });
    }),

    // MULTIPART -> JSON should be blocked (multipart consumes body)
    new Route("POST", "/ctx/reparse/multipart-then-json", async (c: HTTPContext) => {
      await c.parseBody(BodyType.MULTIPART_FORM);
      // should throw SystemErr(BODY_PARSING_FAILED)
      await c.parseBody(BodyType.JSON);
      c.json({ ok: false, shouldNot: "reach" });
    }),

    // Header newline protection
    new Route("GET", "/ctx/header/newline", async (c: HTTPContext) => {
      // should throw SystemErr(INTERNAL_SERVER_ERR)
      c.setHeader("X-Test", "ok\r\ninjected: true");
      c.text("should not reach");
    }),
  );
}
