import { expect, test } from "bun:test";
import { BaseURL } from "./baseURL";

const WS_URL = BaseURL.replace("http", "ws");

test("WS Validator: Should allow clean messages", async () => {
  const socket = new WebSocket(`${WS_URL}/ws/validator`);
  const response = await new Promise((resolve) => {
    socket.onopen = () => socket.send("hello world");
    socket.onmessage = (event) => {
      socket.close();
      resolve(event.data);
    };
  });
  expect(response).toBe("clean: hello world");
});

test("WS Validator: Should close connection on validation failure", async () => {
  const socket = new WebSocket(`${WS_URL}/ws/validator`);
  const result = await new Promise((resolve) => {
    socket.onopen = () => socket.send("this is a badword");
    socket.onclose = (event) => {
      resolve({ code: event.code, reason: event.reason });
    };
  });
  // 1008 is Policy Violation (often used for validation failure)
  expect((result as any).code).toBe(1008);
  expect((result as any).reason).toContain("Profanity detected");
});