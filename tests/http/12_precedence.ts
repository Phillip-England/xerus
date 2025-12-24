import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { json } from "../../src/std/Response";
import { param } from "../../src/std/Request";

class ConflictStatic extends XerusRoute {
  method = Method.GET;
  path = "/conflict/static";
  async handle(c: HTTPContext) {
    json(c, { type: "exact" });
  }
}

class ConflictParam extends XerusRoute {
  method = Method.GET;
  path = "/conflict/:id";
  async handle(c: HTTPContext) {
    json(c, { type: "param", val: param(c, "id") });
  }
}

class FallbackExact extends XerusRoute {
  method = Method.GET;
  path = "/fallback/folder/valid";
  async handle(c: HTTPContext) {
    json(c, { type: "deep-exact" });
  }
}

class FallbackParam extends XerusRoute {
  method = Method.GET;
  path = "/fallback/:id/valid";
  async handle(c: HTTPContext) {
    json(c, { type: "deep-param", id: param(c, "id") });
  }
}

class WildA extends XerusRoute {
  method = Method.GET;
  path = "/wild/a";
  async handle(c: HTTPContext) {
    json(c, { type: "exact-a" });
  }
}

class WildAny extends XerusRoute {
  method = Method.GET;
  path = "/wild/*";
  async handle(c: HTTPContext) {
    json(c, { type: "wildcard" });
  }
}

class MixedParam extends XerusRoute {
  method = Method.GET;
  path = "/mixed/:id";
  async handle(c: HTTPContext) {
    json(c, { type: "param-mixed", id: param(c, "id") });
  }
}

export function precedence(app: Xerus) {
  app.mount(
    ConflictStatic,
    ConflictParam,
    FallbackExact,
    FallbackParam,
    WildA,
    WildAny,
    MixedParam,
  );
}