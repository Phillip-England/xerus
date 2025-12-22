import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

// This test verifies that data doesn't leak between requests
// when the server is using the same HTTPContext objects from the pool.

test("ObjectPool: Request 1 should set data", async () => {
  const res = await fetch(`${BaseURL}/pool/set?val=A`);
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.value).toBe("A");
});

test("ObjectPool: Request 2 should NOT see data from Request 1", async () => {
  // We don't send ?val=... here.
  // If the context wasn't reset properly, it might still have "A" in the store or params.
  const res = await fetch(`${BaseURL}/pool/get`);
  const data = await res.json();

  expect(res.status).toBe(200);
  // Should be empty/undefined, not "A"
  expect(data.value).toBeFalsy();
});

test("ObjectPool: Headers should be clean on new request", async () => {
  // First request sets a header
  await fetch(`${BaseURL}/pool/set-header`);

  // Second request checks if that header exists (it shouldn't)
  const res = await fetch(`${BaseURL}/pool/check-header`);
  const headerVal = res.headers.get("X-Leaked-Header");

  expect(headerVal).toBeNull();
});

test("ObjectPool: Status code should reset to 200", async () => {
  // First request sets status 400
  await fetch(`${BaseURL}/pool/error`);

  // Second request should be 200 by default
  const res = await fetch(`${BaseURL}/pool/get`);
  expect(res.status).toBe(200);
});
