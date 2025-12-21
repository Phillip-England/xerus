// PATH: /home/jacex/src/xerus/examples/23_ws_validation.ts

import { Xerus } from "../src/Xerus";
import { WSRoute, WSMethod } from "../src/WSRoute";
import { Source } from "../src/ValidationSource";
import type { WSContext } from "../src/WSContext";
import type { TypeValidator } from "../src/TypeValidator";
import { Validator } from "../src/Validator";

const app = new Xerus();

type ChatMessage = { type: "chat"; text: string; timestamp?: any };

class WSMessagePayload implements TypeValidator {
  msg: ChatMessage;

  constructor(raw: any) {
    const v = new Validator(raw);
    // WS_MESSAGE gives string/buffer => we validate as JSON string
    const parsed = v
      .isString()
      .nonEmpty()
      .parseJSON()
      .shape({
        type: (v) => v.oneOf(["chat"] as const).value,
        text: (v) => v.isString().nonEmpty().value,
        timestamp: (v) => v.optional().value,
      }).value as ChatMessage;

    this.msg = parsed;
  }

  async validate(_c: WSContext) {}
}

app.mount(
  new WSRoute(WSMethod.MESSAGE, "/ws/channel", async (c: WSContext, data) => {
    const payload = data.get(WSMessagePayload).msg;

    console.log(`Received: ${payload.text}`);
    c.ws.send(`Echo: ${payload.text}`);
  }).validate(Source.WS_MESSAGE(), WSMessagePayload),
);

console.log('Connect to ws://localhost:8080/ws/channel and send {"type":"chat","text":"Hello"}');
await app.listen(8080);
