import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";

export function wsAdvancedMethods(app: Xerus) {
  // 1. Pub/Sub - A simple chat room
  
  // Register the Open handler to subscribe users
  app.open("/ws/room/:name", async (ws) => {
    const room = ws.data.getParam("name");
    ws.subscribe(room);
    ws.publish(room, `User joined ${room}`);
  });

  // Register the Message handler on the SAME path (merges automatically)
  app.message("/ws/room/:name", async (ws, message) => {
    const room = ws.data.getParam("name");
    // Publish to everyone in the room except the sender
    ws.publish(room, message);
  });

  // 2. Binary Data Echo
  app.message("/ws/binary", async (ws, message) => {
    if (message instanceof Buffer) {
      // Echo back the binary data
      ws.send(message);
    }
  });

  // 3. Close Handler Tracking
  // We'll use a simple global counter to verify the close handler actually runs
  let closedConnections = 0;
  
  app.get("/ws-stats", async (c: HTTPContext) => {
    c.json({ closed: closedConnections });
  });

  app.close("/ws/lifecycle", async (ws, code, reason) => {
    closedConnections++;
  });
}