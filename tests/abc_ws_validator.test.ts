import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { TestStore } from "./TestStore";
import type { TypeValidator } from "../src/XerusValidator";
import { SystemErr } from "../src/SystemErr";
import { SystemErrCode } from "../src/SystemErrCode";
import type { HTTPContext } from "../src/HTTPContext";
import { ws } from "../src/std/Request";

function makeWSURL(port: number, path: string) {
  return `ws://127.0.0.1:${port}${path}`;
}

/* ======================
   Validator + Route
====================== */

export class ChatMessageValidator implements TypeValidator<string> {
  async validate(c: HTTPContext): Promise<string> {
    const content = String(ws(c).message);

    if (content.includes("badword")) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Profanity detected",
      );
    }

    return content;
  }
}

class ValidatorWsRoute extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/validator";
  services = [TestStore];
  validators = [ChatMessageValidator];

  async handle(c: HTTPContext) {
    const socket = ws(c);
    const content = c.validated(ChatMessageValidator);
    socket.send(`clean: ${content}`);
  }
}

/* ======================
   Tests
====================== */

describe("WS validator", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();
    app.mount(ValidatorWsRoute);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("WS Validator: Should allow clean messages", async () => {
    const socket = new WebSocket(makeWSURL(port, "/ws/validator"));

    const response = await new Promise<string>((resolve) => {
      socket.onopen = () => socket.send("hello world");
      socket.onmessage = (event) => {
        socket.close();
        resolve(String(event.data));
      };
    });

    expect(response).toBe("clean: hello world");
  });

  test("WS Validator: Should close connection on validation failure", async () => {
    const socket = new WebSocket(makeWSURL(port, "/ws/validator"));

    const result = await new Promise<{ code: number; reason: string }>((resolve) => {
      socket.onopen = () => socket.send("this is a badword");

      socket.onclose = (event) => {
        resolve({ code: event.code, reason: event.reason });
      };
    });

    // 1008 = Policy Violation (commonly used for validation/policy failures)
    expect(result.code).toBe(1008);
    expect(result.reason).toContain("Profanity detected");
  });
});
