import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";

const app = new Xerus();

app.mount(
  new Route("GET", "/login", async (c) => {
    c.setCookie("session_id", "xyz-123", {
      httpOnly: true,
      maxAge: 3600,
      sameSite: "Lax",
    });
    c.text("Cookie Set!");
  }),

  new Route("GET", "/dashboard", async (c) => {
    const session = c.getCookie("session_id");
    if (!session) return c.setStatus(403).text("No cookie found");
    c.text(`Logged in with session: ${session}`);
  }),

  new Route("GET", "/logout", async (c) => {
    c.clearCookie("session_id");
    c.text("Logged out.");
  }),
);

await app.listen(8080);
