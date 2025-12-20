// PATH: /home/jacex/src/xerus/servers/websocket/1_wsAdvanced.ts

import { Xerus } from "../../src/Xerus";
import { WSRoute, WSMethod } from "../../src/WSRoute";
import { HTTPContext } from "../../src/HTTPContext";
import { Route } from "../../src/Route";
import type { WSContext } from "../../src/WSContext";

export function wsAdvancedMethods(app: Xerus) {
  // 1. Pub/Sub (OPEN + MESSAGE)
  app.mount(
    new WSRoute(WSMethod.OPEN, "/ws/room/:name", async (c: WSContext) => {
      const room = c.http.getParam("name");
      c.ws.subscribe(room);
      c.ws.publish(room, `User joined ${room}`);
    }),

    new WSRoute(WSMethod.MESSAGE, "/ws/room/:name", async (c: WSContext) => {
      const room = c.http.getParam("name");
      c.ws.publish(room, c.message);
    }),
  );

  // 2. Binary Echo (MESSAGE)
  app.mount(
    new WSRoute(WSMethod.MESSAGE, "/ws/binary", async (c: WSContext) => {
      c.ws.send(c.message);
    }),
  );

  // 3. Close tracking (CLOSE)
  let closedConnections = 0;

  app.mount(
    new Route("GET", "/ws-stats", async (c: HTTPContext) => {
      c.json({ closed: closedConnections });
    }),

    new WSRoute(WSMethod.CLOSE, "/ws/lifecycle", async (_c: WSContext) => {
      closedConnections++;
    }),
  );
}
