import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";
import { mwGroupHeader } from "../middleware/mwGroupHeader";

export function wsMethods(app: Xerus) {
  // Simple Echo Server
  app.ws("/ws/echo", {
    message: async (ws, message) => {
      ws.send(`echo: ${message}`);
    },
  });

  // Protected/Middleware Route
  app.ws("/ws/chat", {
    open: async (ws) => {
      // Check if middleware passed data
      const auth = ws.data.getResHeader("X-Group-Auth");
      ws.send(`auth-${auth}`);
    },
    message: async (ws, message) => {
      ws.send(`chat: ${message}`);
    },
  }, mwGroupHeader);
}