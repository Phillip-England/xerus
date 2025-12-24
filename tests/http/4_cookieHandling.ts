import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { reqCookie } from "../../src/std/Request";
import { setCookie, clearCookie, json } from "../../src/std/Response";

class SetCookie extends XerusRoute {
  method = Method.GET;
  path = "/cookies/set";
  async handle(c: HTTPContext) {
    setCookie(c, "theme", "dark", { path: "/", httpOnly: true });
    json(c, { message: "Cookie set" });
  }
}

class SetComplexCookie extends XerusRoute {
  method = Method.GET;
  path = "/cookies/set-complex";
  async handle(c: HTTPContext) {
    setCookie(c, "session_id", "12345", {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 3600,
    });
    setCookie(c, "preferences", "compact", { path: "/admin" });
    json(c, { message: "Complex cookies set" });
  }
}

class GetCookie extends XerusRoute {
  method = Method.GET;
  path = "/cookies/get";
  async handle(c: HTTPContext) {
    const theme = reqCookie(c, "theme");
    json(c, { theme });
  }
}

class ClearCookie extends XerusRoute {
  method = Method.GET;
  path = "/cookies/clear";
  async handle(c: HTTPContext) {
    clearCookie(c, "theme");
    json(c, { message: "Cookie cleared" });
  }
}

export function cookieHandling(app: Xerus) {
  app.mount(SetCookie, SetComplexCookie, GetCookie, ClearCookie);
}
