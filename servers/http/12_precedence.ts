import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";

// 1. Simple Conflict
class ConflictStatic extends XerusRoute {
  method = Method.GET;
  path = "/conflict/static";
  async handle(c: HTTPContext) {
    c.json({ type: "exact" });
  }
}

class ConflictParam extends XerusRoute {
  method = Method.GET;
  path = "/conflict/:id";
  async handle(c: HTTPContext) {
    c.json({ type: "param", val: c.getParam("id") });
  }
}

// 2. Deep nesting fallback
class FallbackExact extends XerusRoute {
  method = Method.GET;
  path = "/fallback/folder/valid";
  async handle(c: HTTPContext) {
    c.json({ type: "deep-exact" });
  }
}

class FallbackParam extends XerusRoute {
  method = Method.GET;
  path = "/fallback/:id/valid";
  async handle(c: HTTPContext) {
    c.json({ type: "deep-param", id: c.getParam("id") });
  }
}

// 3. Wildcards
class WildA extends XerusRoute {
  method = Method.GET;
  path = "/wild/a";
  async handle(c: HTTPContext) {
    c.json({ type: "exact-a" });
  }
}

class WildAny extends XerusRoute {
  method = Method.GET;
  path = "/wild/*";
  async handle(c: HTTPContext) {
    c.json({ type: "wildcard" });
  }
}

// 4. Mixed Fallthrough
class MixedParam extends XerusRoute {
  method = Method.GET;
  path = "/mixed/:id";
  async handle(c: HTTPContext) {
    c.json({ type: "param-mixed", id: c.getParam("id") });
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
    MixedParam
  );
}