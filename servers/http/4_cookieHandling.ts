import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";

export function cookieHandling(app: Xerus) {
  app.mount(
    new Route("GET", "/cookies/set", async (c: HTTPContext) => {
      c.setCookie("theme", "dark", { path: "/", httpOnly: true });
      c.json({ message: "Cookie set" });
    }),

    new Route("GET", "/cookies/set-complex", async (c: HTTPContext) => {
      c.setCookie("session_id", "12345", {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 3600,
      });
      c.setCookie("preferences", "compact", { path: "/admin" });
      c.json({ message: "Complex cookies set" });
    }),

    new Route("GET", "/cookies/get", async (c: HTTPContext) => {
      const theme = c.getCookie("theme");
      c.json({ theme });
    }),

    new Route("GET", "/cookies/clear", async (c: HTTPContext) => {
      c.clearCookie("theme");
      c.json({ message: "Cookie cleared" });
    })
  );
}