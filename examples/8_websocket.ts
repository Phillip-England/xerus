import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";
import { logger } from "../src/Middleware";
import type { ServerWebSocket } from "bun";

const app = new Xerus();

// 1. Open Handler (with specific middleware)
app.open("/chat", async (ws: ServerWebSocket<HTTPContext>) => {
  console.log("Client connected");
  ws.send("Welcome to Xerus Chat!");
}, logger);

// 2. Message Handler
app.message("/chat", async (ws, message) => {
  // Echo functionality
  ws.send(`You said: ${message}`);
  
  if (message === "close") {
    ws.close(1000, "Bye!");
  }
});

// 3. Close Handler
app.close("/chat", async (ws, code, reason) => {
  console.log(`Closed: ${code} - ${reason}`);
});

console.log("Connect via ws://localhost:8080/chat");
await app.listen(8080);