import { Xerus } from "../../src/Xerus";
import { WSRoute } from "../../src/WSRoute";
import { mwGroupHeader } from "../middleware/mwGroupHeader";

export function wsMethods(app: Xerus) {
  // Simple Echo Server
  const echoRoute = new WSRoute("/ws/echo");
  echoRoute.message(async (ws, message) => {
      ws.send(`echo: ${message}`);
  });
  app.mount(echoRoute);

  // Protected/Middleware Route
  const chatRoute = new WSRoute("/ws/chat");

  // Attach middleware specifically to the open event
  chatRoute.open(async (ws) => {
      const auth = ws.data.getResHeader("X-Group-Auth");
      ws.send(`auth-${auth}`);
  }, mwGroupHeader);

  chatRoute.message(async (ws, message) => {
      ws.send(`chat: ${message}`);
  });
  app.mount(chatRoute);
}