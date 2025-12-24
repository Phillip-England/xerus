import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Safeguard: Service onError should capture handler exception", async () => {
  const res = await fetch(`${BaseURL}/safeguard/fail`);
  const data = await res.json();
  expect(res.status).toBe(500);
  expect(data.error.code).toBe("SERVICE_CAUGHT");
  expect(data.error.detail).toBe("Handler Failed");
});

test("Safeguard: Normal route should pass", async () => {
  const res = await fetch(`${BaseURL}/safeguard/ok`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.status).toBe("ok");
});