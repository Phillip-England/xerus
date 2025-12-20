import { Xerus } from "../src/Xerus";
import { logger } from "../src/Middleware";

const app = new Xerus();
const ws = app.group("/ws", logger);

// 1. Register Open Handler
ws.open("/chat", async (ws) => {
  ws.send("👋 Welcome!");
});

// 2. Register Message Handler (merges into the same route)
ws.message("/chat", async (ws, msg) => {
  ws.send(`echo: ${msg}`);
});

// 3. Register Close Handler (merges into the same route)
ws.close("/chat", async () => {
  console.log("Client left");
});

await app.listen(8080);