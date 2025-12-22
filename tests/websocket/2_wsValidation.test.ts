import { expect, test } from "bun:test";
import { BaseURL } from "./baseURL";

const WS_URL = BaseURL.replace("http", "ws");

test("WS Validation: Valid 'chat' message should pass", async () => {
  const socket = new WebSocket(`${WS_URL}/ws/validate`);
  const payload = { type: "chat", content: "Hello Validator" };

  const response = await new Promise((resolve, reject) => {
    socket.onopen = () => socket.send(JSON.stringify(payload));
    socket.onmessage = (event) => {
      socket.close();
      resolve(event.data);
    };
    socket.onerror = (e) => reject(e);
  });

  expect(response).toBe("received: Hello Validator");
});

test("WS Validation: Valid 'ping' message should pass", async () => {
  const socket = new WebSocket(`${WS_URL}/ws/validate`);
  const payload = { type: "ping", content: "ignore-me" };

  const response = await new Promise((resolve) => {
    socket.onopen = () => socket.send(JSON.stringify(payload));
    socket.onmessage = (event) => {
      socket.close();
      resolve(event.data);
    };
  });

  expect(response).toBe("pong");
});

test("WS Validation: Invalid schema (missing content) should block handler", async () => {
  const socket = new WebSocket(`${WS_URL}/ws/validate`);
  // Missing 'content' field, which is required by Zod schema
  const payload = { type: "chat" };

  const result = await new Promise((resolve) => {
    socket.onopen = () => socket.send(JSON.stringify(payload));

    // If validation fails, the handler is never called, so we shouldn't get a message.
    // The middleware throws an error, which usually closes the socket in Bun if unhandled.
    socket.onclose = (event) => {
      resolve("socket_closed");
    };

    socket.onmessage = (event) => {
      resolve(event.data); // This would be a failure for this test
    };
  });

  // We expect the socket to close or timeout, but definitely NOT echo back.
  // In this setup, unhandled middleware errors bubble up and close the connection.
  expect(result).toBe("socket_closed");
});

test("WS Validation: Malformed JSON should block handler", async () => {
  const socket = new WebSocket(`${WS_URL}/ws/validate`);

  const result = await new Promise((resolve) => {
    socket.onopen = () => socket.send("{ invalid_json: ");

    socket.onclose = () => resolve("socket_closed");
    socket.onmessage = (event) => resolve(event.data);
  });

  expect(result).toBe("socket_closed");
});
