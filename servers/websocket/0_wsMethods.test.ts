import { expect, test } from "bun:test";
import { BaseURL } from "./baseURL";


test("WebSocket: Should echo messages back", async () => {
  const socket = new WebSocket(`${BaseURL}/ws/echo`);

  const response = await new Promise((resolve, reject) => {
    socket.onopen = () => socket.send("hello xerus");
    socket.onmessage = (event) => {
      socket.close();
      resolve(event.data);
    };
    socket.onerror = (err) => reject(err);
  });

  expect(response).toBe("echo: hello xerus");
});

test("WebSocket: Should respect middleware on protected route", async () => {
  const socket = new WebSocket(`${BaseURL}/ws/chat`);

  const response = await new Promise((resolve) => {
    socket.onmessage = (event) => {
      socket.close();
      resolve(event.data);
    };
  });

  // Our mwGroupHeader sets 'X-Group-Auth' to 'passed'
  expect(response).toBe("auth-passed");
});

test("WebSocket: Middleware echo test", async () => {
  const socket = new WebSocket(`${BaseURL}/ws/chat`);

  const response = await new Promise((resolve) => {
    let count = 0;
    socket.onmessage = (event) => {
      count++;
      if (count === 1) {
        // Skip the auth message from 'open'
        socket.send("ping");
      } else {
        socket.close();
        resolve(event.data);
      }
    };
  });

  expect(response).toBe("chat: ping");
});