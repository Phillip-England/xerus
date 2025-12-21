import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";

class SetCookie extends XerusRoute {
  method = Method.GET;
  path = "/cookies/set";
  async handle(c: HTTPContext) {
    c.setCookie("theme", "dark", { path: "/", httpOnly: true });
    c.json({ message: "Cookie set" });
  }
}

class SetComplexCookie extends XerusRoute {
  method = Method.GET;
  path = "/cookies/set-complex";
  async handle(c: HTTPContext) {
    c.setCookie("session_id", "12345", {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 3600,
    });
    c.setCookie("preferences", "compact", { path: "/admin" });
    c.json({ message: "Complex cookies set" });
  }
}

class GetCookie extends XerusRoute {
  method = Method.GET;
  path = "/cookies/get";
  async handle(c: HTTPContext) {
    const theme = c.getCookie("theme");
    c.json({ theme });
  }
}

class ClearCookie extends XerusRoute {
  method = Method.GET;
  path = "/cookies/clear";
  async handle(c: HTTPContext) {
    c.clearCookie("theme");
    c.json({ message: "Cookie cleared" });
  }
}

export function cookieHandling(app: Xerus) {
  app.mount(SetCookie, SetComplexCookie, GetCookie, ClearCookie);
}