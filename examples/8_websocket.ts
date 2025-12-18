import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";
import { Middleware, logger } from "../src/Middleware";
import type { ServerWebSocket } from "bun";

const app = new Xerus();

// Define WebSocket route
app.ws("/chat", {
  open: {
    handler: async (ws: ServerWebSocket<HTTPContext>) => {
      console.log("Client connected");
      ws.send("Welcome to Xerus Chat!");
    },
    middlewares: [logger] // Middleware specifically for the Open event
  },

  message: async (ws, message) => {
    // Echo functionality
    ws.send(`You said: ${message}`);
    
    if (message === "close") {
      ws.close(1000, "Bye!");
    }
  },

  close: async (ws, code, reason) => {
    console.log(`Closed: ${code} - ${reason}`);
  }
});

console.log("Connect via ws://localhost:8080/chat");
await app.listen(8080);