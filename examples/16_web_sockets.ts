import { HTTPContext, logger, Xerus } from "../";
import type { ServerWebSocket } from "bun";

const app = new Xerus();

app.ws("/chat", {

  // middleware on these two
  open: {
    handler: async (ws: ServerWebSocket<HTTPContext>) => {
      console.log("Client connected to chat");
    },
    middlewares: [logger] 
  },
  
  message: {
    handler: async (ws: ServerWebSocket<HTTPContext>, message: string | Buffer) => {
      ws.send(`You said: ${message}`);
    },
    middlewares: [logger]
  },

  // no middleware on these two
  close: async (ws: ServerWebSocket<HTTPContext>, code: number, reason: string) => {
    console.log(`Connection closed: ${code} ${reason}`);
  },

  drain: async (ws: ServerWebSocket<HTTPContext>) => {
    console.log("Buffer drained");
  }

}, logger); // <== shared middleware

await app.listen(8080);