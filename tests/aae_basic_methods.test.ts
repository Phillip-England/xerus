import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import { SystemErrCode } from "../src/SystemErrCode";
import { BodyType } from "../src/BodyType";
import type { TypeValidator } from "../src/TypeValidator";
import { parseBody } from "../src/std/Body";
import {
  json,
  redirect,
  setHeader,
  setStatus,
  text,
} from "../src/std/Response";
import { header, query } from "../src/std/Request";
import { SystemErr } from "../src/SystemErr";

class JsonObjectBody implements TypeValidator {
  async validate(c: HTTPContext) {
    const body = await parseBody(c, BodyType.JSON);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Expected JSON object body",
      );
    }
    return body;
  }
}

class Root extends XerusRoute {
  method = Method.GET;
  path = "/";
  async handle(c: HTTPContext) {
    json(c, { message: "Hello, world!" });
  }
}

class CreateItem extends XerusRoute {
  method = Method.POST;
  path = "/items";
  validators = [JsonObjectBody];
  async handle(c: HTTPContext) {
    const body = c.validated(JsonObjectBody);
    setStatus(c, 201);
    json(c, { message: "Item created", data: body });
  }
}

class UpdateItem extends XerusRoute {
  method = Method.PUT;
  path = "/items/1";
  validators = [JsonObjectBody];
  async handle(c: HTTPContext) {
    const body = c.validated(JsonObjectBody);
    json(c, { message: "Item 1 updated", data: body });
  }
}

class DeleteItem extends XerusRoute {
  method = Method.DELETE;
  path = "/items/1";
  async handle(c: HTTPContext) {
    json(c, { message: "Item 1 deleted" });
  }
}

class RedirSimple extends XerusRoute {
  method = Method.GET;
  path = "/redir/simple";
  async handle(c: HTTPContext) {
    redirect(c, "/");
  }
}

class RedirQuery extends XerusRoute {
  method = Method.GET;
  path = "/redir/query";
  async handle(c: HTTPContext) {
    redirect(c, "/?existing=1", { new: "2" });
  }
}

class RedirUnsafe extends XerusRoute {
  method = Method.GET;
  path = "/redir/unsafe";
  async handle(c: HTTPContext) {
    const dangerous = "Hack\r\nLocation: google.com";
    redirect(c, "/", { msg: dangerous });
  }
}

class Ping extends XerusRoute {
  method = Method.GET;
  path = "/basics/ping";
  async handle(c: HTTPContext) {
    setHeader(c, "X-Ping", "pong");
    text(c, "pong");
  }
}

class HeadPing extends XerusRoute {
  method = Method.HEAD;
  path = "/basics/ping";
  async handle(c: HTTPContext) {
    setHeader(c, "X-Ping", "pong");
    setStatus(c, 200);
    text(c, "");
  }
}

class OptionsPing extends XerusRoute {
  method = Method.OPTIONS;
  path = "/basics/ping";
  async handle(c: HTTPContext) {
    setHeader(c, "Allow", "GET, HEAD, OPTIONS");
    setStatus(c, 204);
    text(c, "");
  }
}

class EchoQuery extends XerusRoute {
  method = Method.GET;
  path = "/basics/echo-query";
  async handle(c: HTTPContext) {
    const a = query(c, "a") || null;
    const b = query(c, "b") || null;
    json(c, { a, b });
  }
}

class EchoHeader extends XerusRoute {
  method = Method.GET;
  path = "/basics/echo-header";
  async handle(c: HTTPContext) {
    const v = header(c, "x-test-header") ?? "";
    setHeader(c, "X-Echo-Test", v);
    json(c, { value: v });
  }
}

class StatusTest extends XerusRoute {
  method = Method.GET;
  path = "/basics/status";
  async handle(c: HTTPContext) {
    setStatus(c, 418);
    text(c, "teapot");
  }
}

class JsonTest extends XerusRoute {
  method = Method.GET;
  path = "/basics/json";
  async handle(c: HTTPContext) {
    json(c, { ok: true, msg: "✨ unicode ok" });
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
