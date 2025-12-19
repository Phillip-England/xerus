import { Xerus } from "../src/Xerus";
import { logger } from "../src/Middleware";

const app = new Xerus();
const ws = app.group("/ws", logger);

ws.ws("/chat", {
  open: async (ws) => {
    ws.send("👋 Welcome!");
  },
  message: async (ws, msg) => {
    ws.send(`echo: ${msg}`);
  },
  close: async () => {
    console.log("Client left");
  },
});

await app.listen(8080);
