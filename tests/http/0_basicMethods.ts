import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Validator } from "../../src/Validator";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import { BodyType } from "../../src/BodyType";
import type { TypeValidator } from "../../src/TypeValidator";

class JsonObjectBody implements TypeValidator {
  body: any;
  
  async validate(c: HTTPContext) {
    this.body = await c.parseBody(BodyType.JSON);
    if (
      !this.body || typeof this.body !== "object" || Array.isArray(this.body)
    ) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Expected JSON object body",
      );
    }
  }
}

class Root extends XerusRoute {
  method = Method.GET;
  path = "/";
  async handle(c: HTTPContext) {
    c.json({ message: "Hello, world!" });
  }
}

class CreateItem extends XerusRoute {
  method = Method.POST;
  path = "/items";
  jsonObj = Validator.Ctx(JsonObjectBody);
  async handle(c: HTTPContext) {
    c.setStatus(201).json({ message: "Item created", data: this.jsonObj.body });
  }
}

class UpdateItem extends XerusRoute {
  method = Method.PUT;
  path = "/items/1";
  jsonObj = Validator.Ctx(JsonObjectBody);
  async handle(c: HTTPContext) {
    c.json({ message: "Item 1 updated", data: this.jsonObj.body });
  }
}

class DeleteItem extends XerusRoute {
  method = Method.DELETE;
  path = "/items/1";
  async handle(c: HTTPContext) {
    c.json({ message: "Item 1 deleted" });
  }
}

class RedirSimple extends XerusRoute {
  method = Method.GET;
  path = "/redir/simple";
  async handle(c: HTTPContext) {
    c.redirect("/");
  }
}

class RedirQuery extends XerusRoute {
  method = Method.GET;
  path = "/redir/query";
  async handle(c: HTTPContext) {
    c.redirect("/?existing=1", { new: "2" });
  }
}

class RedirUnsafe extends XerusRoute {
  method = Method.GET;
  path = "/redir/unsafe";
  async handle(c: HTTPContext) {
    const dangerous = "Hack\r\nLocation: google.com";
    c.redirect("/", { msg: dangerous });
  }
}

class Ping extends XerusRoute {
  method = Method.GET;
  path = "/basics/ping";
  async handle(c: HTTPContext) {
    c.setHeader("X-Ping", "pong");
    c.text("pong");
  }
}

class HeadPing extends XerusRoute {
  method = Method.HEAD;
  path = "/basics/ping";
  async handle(c: HTTPContext) {
    c.setHeader("X-Ping", "pong");
    c.setStatus(200).text("");
  }
}

class OptionsPing extends XerusRoute {
  method = Method.OPTIONS;
  path = "/basics/ping";
  async handle(c: HTTPContext) {
    c.setHeader("Allow", "GET, HEAD, OPTIONS");
    c.setStatus(204).text("");
  }
}

class EchoQuery extends XerusRoute {
  method = Method.GET;
  path = "/basics/echo-query";
  async handle(c: HTTPContext) {
    const a = c.url.searchParams.get("a");
    const b = c.url.searchParams.get("b");
    c.json({ a, b });
  }
}

class EchoHeader extends XerusRoute {
  method = Method.GET;
  path = "/basics/echo-header";
  async handle(c: HTTPContext) {
    const v = c.req.headers.get("x-test-header") ?? "";
    c.setHeader("X-Echo-Test", v);
    c.json({ value: v });
  }
}

class StatusTest extends XerusRoute {
  method = Method.GET;
  path = "/basics/status";
  async handle(c: HTTPContext) {
    c.setStatus(418).text("teapot");
  }
}

class JsonTest extends XerusRoute {
  method = Method.GET;
  path = "/basics/json";
  async handle(c: HTTPContext) {
    c.json({ ok: true, msg: "✨ unicode ok" });
  }
}

export function basicMethods(app: Xerus) {
  app.mount(
    Root,
    CreateItem,
    UpdateItem,
    DeleteItem,
    RedirSimple,
    RedirQuery,
    RedirUnsafe,
    Ping,
    HeadPing,
    OptionsPing,
    EchoQuery,
    EchoHeader,
    StatusTest,
    JsonTest,
  );
}