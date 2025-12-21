import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// 1. Login Route: Sets a secure cookie
class LoginRoute extends XerusRoute {
  method = Method.GET;
  path = "/login";

  async handle(c: HTTPContext) {
    c.setCookie("session_id", "xyz-123", {
      httpOnly: true,
      maxAge: 3600,
      sameSite: "Lax",
    });
    c.text("Cookie Set!");
  }
}

// 2. Dashboard Route: Retrieves and validates the cookie
class DashboardRoute extends XerusRoute {
  method = Method.GET;
  path = "/dashboard";

  async handle(c: HTTPContext) {
    const session = c.getCookie("session_id");
    
    if (!session) {
      return c.setStatus(403).text("No cookie found");
    }
    
    c.text(`Logged in with session: ${session}`);
  }
}

// 3. Logout Route: Clears the cookie
class LogoutRoute extends XerusRoute {
  method = Method.GET;
  path = "/logout";

  async handle(c: HTTPContext) {
    c.clearCookie("session_id");
    c.text("Logged out.");
  }
}

// Mount the class blueprints
app.mount(LoginRoute, DashboardRoute, LogoutRoute);

console.log("🚀 Cookie example running on http://localhost:8080");
await app.listen(8080);