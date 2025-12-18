import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";

export function cookieMethods(app: Xerus) {
  app.get("/cookies/set", async (c: HTTPContext) => {
    c.setCookie("theme", "dark", { path: "/", httpOnly: true });
    c.json({ message: "Cookie set" });
  });

  app.get("/cookies/set-complex", async (c: HTTPContext) => {
    c.setCookie("session_id", "12345", {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 3600,
    });
    c.setCookie("preferences", "compact", { path: "/admin" });
    c.json({ message: "Complex cookies set" });
  });

  app.get("/cookies/get", async (c: HTTPContext) => {
    const theme = c.getCookie("theme");
    c.json({ theme });
  });

  app.get("/cookies/clear", async (c: HTTPContext) => {
    c.clearCookie("theme");
    c.json({ message: "Cookie cleared" });
  });
}