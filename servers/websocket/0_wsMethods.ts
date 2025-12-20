// PATH: /home/jacex/src/xerus/servers/websocket/0_wsMethods.ts

import { Xerus } from "../../src/Xerus";
import { WSRoute, WSMethod } from "../../src/WSRoute";
import { mwGroupHeader } from "../middleware/mwGroupHeader";
import type { WSContext } from "../../src/WSContext";

export function wsMethods(app: Xerus) {
  app.mount(
    new WSRoute(WSMethod.MESSAGE, "/ws/echo", async (c: WSContext) => {
      c.ws.send(`echo: ${c.message}`);
    }),
  );

  // Protected/Middleware Route (OPEN + MESSAGE)
  app.mount(
    new WSRoute(WSMethod.OPEN, "/ws/chat", async (c: WSContext) => {
      const auth = c.http.getResHeader("X-Group-Auth");
      c.ws.send(`auth-${auth}`);
    }).use(mwGroupHeader),

    new WSRoute(WSMethod.MESSAGE, "/ws/chat", async (c: WSContext) => {
      c.ws.send(`chat: ${c.message}`);
    }),
  );
}
