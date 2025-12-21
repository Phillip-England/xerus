import { Xerus } from "../src/Xerus";
import { WSRoute, WSMethod } from "../src/WSRoute";
import { Source } from "../src/ValidationSource";
import type { WSContext } from "../src/WSContext";

const app = new Xerus();

app.mount(
  new WSRoute(WSMethod.MESSAGE, "/ws/channel", async (c: WSContext, data) => {
    const msg = data.get("message") as any;
    console.log(`Received: ${msg.text}`);
    c.ws.send(`Echo: ${msg.text}`);
  }).validate(
    Source.WS_MESSAGE(),
    "message",
    (_c, v) =>
      v
        .parseJSON()
        .shape({
          type: (v) => v.oneOf(["chat"]),
          text: (v) => v.isString().nonEmpty(),
          timestamp: (v) => v.optional(),
        }).value,
  ),
);

console.log(
  'Connect to ws://localhost:8080/ws/channel and send {"type":"chat","text":"Hello"}',
);
await app.listen(8080);
