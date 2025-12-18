import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

app.get("/login", (c: HTTPContext) => {
  // Set Cookie
  c.setCookie("session_id", "xyz-123", {
    httpOnly: true,
    maxAge: 3600, // 1 hour
    sameSite: "Lax"
  });
  return c.text("Cookie Set!");
});

app.get("/dashboard", (c: HTTPContext) => {
  // Read Cookie
  const session = c.getCookie("session_id");
  if (!session) return c.setStatus(403).text("No cookie found");
  
  return c.text(`Logged in with session: ${session}`);
});

app.get("/logout", (c: HTTPContext) => {
  // Clear Cookie
  c.clearCookie("session_id");
  return c.text("Logged out.");
});

await app.listen(8080);