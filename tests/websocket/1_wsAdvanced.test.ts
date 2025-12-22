import { expect, test } from "bun:test";
import { BaseURL } from "./baseURL";

const WS_URL = BaseURL.replace("http", "ws");

test("WebSocket: Binary data should be preserved", async () => {
  const socket = new WebSocket(`${WS_URL}/ws/binary`);
  socket.binaryType = "arraybuffer";

  const inputData = new Uint8Array([1, 2, 3, 4, 5]);

  const response = await new Promise((resolve) => {
    socket.onopen = () => socket.send(inputData);
    socket.onmessage = (event) => {
      socket.close();
      resolve(new Uint8Array(event.data));
    };
  });

  expect(response).toEqual(inputData);
});

test("WebSocket: Pub/Sub should broadcast to other clients", async () => {
  const clientA = new WebSocket(`${WS_URL}/ws/room/lobby`);
  const clientB = new WebSocket(`${WS_URL}/ws/room/lobby`);

  const broadcastPromise = new Promise((resolve) => {
    let messagesReceived = 0;
    clientB.onmessage = (event) => {
      messagesReceived++;
      // We ignore the "User joined" auto-message and wait for Client A's specific text
      if (event.data === "hello from A") {
        clientA.close();
        clientB.close();
        resolve(event.data);
      }
    };
  });

  // Wait for both to be open, then A sends a message
  await new Promise((r) => setTimeout(r, 100));
  clientA.send("hello from A");

  const result = await broadcastPromise;
  expect(result).toBe("hello from A");
});

test("WebSocket: Server-side close handler should trigger", async () => {
  // 1. Check initial stats
  const preRes = await fetch(`${BaseURL}/ws-stats`);
  const preData = await preRes.json();
  const initialClosed = preData.closed;

  // 2. Connect and immediately close from client side
  const socket = new WebSocket(`${WS_URL}/ws/lifecycle`);
  await new Promise((resolve) => {
    socket.onopen = () => {
      socket.close();
      // Small timeout to allow server-side event loop to process the close
      setTimeout(resolve, 100);
    };
  });

  // 3. Verify stats updated on server
  const postRes = await fetch(`${BaseURL}/ws-stats`);
  const postData = await postRes.json();
  expect(postData.closed).toBe(initialClosed + 1);
});
