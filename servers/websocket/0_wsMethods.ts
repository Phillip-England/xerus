import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";
import { mwGroupHeader } from "../middleware/mwGroupHeader";

export function wsMethods(app: Xerus) {
  // Simple Echo Server
  // Note: We now use .message() directly instead of passing an object
  app.message("/ws/echo", async (ws, message) => {
      ws.send(`echo: ${message}`);
  });

  // Protected/Middleware Route
  // We attach the middleware to the 'open' event specifically
  app.open("/ws/chat", async (ws) => {
      // Check if middleware passed data
      const auth = ws.data.getResHeader("X-Group-Auth");
      ws.send(`auth-${auth}`);
  }, mwGroupHeader);

  // We add the message handler to the SAME path.
  // The 'register' method in Xerus will merge this into the existing handler.
  app.message("/ws/chat", async (ws, message) => {
      ws.send(`chat: ${message}`);
  });
}