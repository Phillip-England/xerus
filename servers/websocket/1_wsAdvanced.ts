import { Xerus } from "../../src/Xerus";
import { WSRoute } from "../../src/WSRoute";
import { HTTPContext } from "../../src/HTTPContext";
import { Route } from "../../src/Route";

export function wsAdvancedMethods(app: Xerus) {
  // 1. Pub/Sub - A simple chat room
  const roomRoute = new WSRoute("/ws/room/:name");
  
  roomRoute.open(async (ws) => {
    const room = ws.data.getParam("name");
    ws.subscribe(room);
    ws.publish(room, `User joined ${room}`);
  });

  roomRoute.message(async (ws, message) => {
    const room = ws.data.getParam("name");
    ws.publish(room, message);
  });
  
  app.mount(roomRoute);

  // 2. Binary Data Echo
  const binRoute = new WSRoute("/ws/binary");
  binRoute.message(async (ws, message) => {
    ws.send(message);
  });
  app.mount(binRoute);

  // 3. Close Handler Tracking
  let closedConnections = 0;
  
  app.mount(new Route("GET", "/ws-stats", async (c: HTTPContext) => {
    c.json({ closed: closedConnections });
  }));

  const lifecycleRoute = new WSRoute("/ws/lifecycle");
  lifecycleRoute.close(async (ws, code, reason) => {
    closedConnections++;
  });
  app.mount(lifecycleRoute);
}