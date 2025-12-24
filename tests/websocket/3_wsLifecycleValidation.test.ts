import { expect, test } from "bun:test";
import { BaseURL } from "./baseURL";

const WS_URL = BaseURL.replace("http", "ws");

function wsWithTimeout(url: string, opts?: any, ms = 2000) {
  return new Promise<WebSocket>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`WS timeout connecting to ${url}`)),
      ms,
    );
    const ws = new WebSocket(url, opts);
    ws.onopen = () => {
      clearTimeout(t);
      resolve(ws);
    };
    ws.onerror = (e) => {
      clearTimeout(t);
      reject(e);
    };
  });
}

function waitForMessage(ws: WebSocket, ms = 2000) {
  return new Promise<any>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error("WS timeout waiting for message")),
      ms,
    );
    ws.onmessage = (ev) => {
      clearTimeout(t);
      resolve(ev.data);
    };
    ws.onerror = (e) => {
      clearTimeout(t);
      reject(e);
    };
  });
}

test("WS: validated should be cleared per-event (OPEN validator must not leak into MESSAGE)", async () => {
  const ws = await wsWithTimeout(`${WS_URL}/ws/lifecycle-validate`, {
    headers: { "X-Client": "tester" },
  });

  const first = await waitForMessage(ws);
  expect(first).toBe("open-ok");

  // FIX: Start listening BEFORE sending to avoid race condition
  const secondProm = waitForMessage(ws);
  ws.send("hi");
  const second = await secondProm;

  expect(second).toBe("cleared");
  ws.close();
});

test("WS: close validator should capture code + reason via Source.WS_CLOSE", async () => {
  const ws = await wsWithTimeout(`${WS_URL}/ws/close-validate`);
  ws.close(4000, "bye");

  // Give server a moment to process the close event
  await new Promise((r) => setTimeout(r, 150));

  const res = await fetch(`${BaseURL}/ws-close-stats`);
  const j = await res.json();

  expect(res.status).toBe(200);
  expect(j.closeCount).toBeGreaterThan(0);
  expect(j.lastClose.code).toBe(4000);
  expect(j.lastClose.reason).toBe("bye");
});