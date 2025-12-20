// PATH: /home/jacex/src/xerus/examples/8_websocket.ts

import { Xerus } from "../src/Xerus";
import { WSRoute, WSMethod } from "../src/WSRoute";
import { logger } from "../src/Middleware";
import type { WSContext } from "../src/WSContext";

const app = new Xerus();

app.mount(
  new WSRoute(WSMethod.OPEN, "/chat", async (c: WSContext) => {
    console.log("Client connected", c.http.path);
    c.ws.send("Welcome to Xerus Chat!");
  }).use(logger),

  new WSRoute(WSMethod.MESSAGE, "/chat", async (c: WSContext) => {
    c.ws.send(`You said: ${c.message}`);
    if (c.message === "close") c.ws.close(1000, "Bye!");
  }).use(logger),

  new WSRoute(WSMethod.CLOSE, "/chat", async (c: WSContext) => {
    console.log(`Closed: ${c.code} - ${c.reason}`);
  }),
);

console.log("Connect via ws://localhost:8080/chat");
await app.listen(8080);
