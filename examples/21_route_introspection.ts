// PATH: /home/jacex/src/xerus/examples/21_route_introspection.ts

import { Xerus } from "../src/Xerus";
import { WSRoute, WSMethod } from "../src/WSRoute";
import { logger } from "../src/Middleware";
import type { WSContext } from "../src/WSContext";

const app = new Xerus();

app.mount(
  new WSRoute(WSMethod.OPEN, "/ws/chat", async (c: WSContext) => {
    c.ws.send("👋 Welcome!");
  }).use(logger),

  new WSRoute(WSMethod.MESSAGE, "/ws/chat", async (c: WSContext) => {
    c.ws.send(`echo: ${c.message}`);
  }).use(logger),

  new WSRoute(WSMethod.CLOSE, "/ws/chat", async (_c: WSContext) => {
    console.log("Client left");
  }).use(logger),
);

await app.listen(8080);
