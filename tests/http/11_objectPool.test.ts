import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("ObjectPool: Request 1 should set data", async () => {
  const res = await fetch(`${BaseURL}/pool/set?val=A`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.value).toBe("A");
});

test("ObjectPool: Request 2 should NOT see data from Request 1", async () => {
  const res = await fetch(`${BaseURL}/pool/get`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.value).toBeFalsy();
});

test("ObjectPool: Headers should be clean on new request", async () => {
  await fetch(`${BaseURL}/pool/set-header`);
  const res = await fetch(`${BaseURL}/pool/check-header`);
  const headerVal = res.headers.get("X-Leaked-Header");
  expect(headerVal).toBeNull();
});

test("ObjectPool: Status code should reset to 200", async () => {
  await fetch(`${BaseURL}/pool/error`);
  const res = await fetch(`${BaseURL}/pool/get`);
  expect(res.status).toBe(200);
});
