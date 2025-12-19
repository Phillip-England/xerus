import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Safeguard: Non-awaited next() should trigger 500 SystemErr", async () => {
  const res = await fetch(`${BaseURL}/safeguard/fail`);
  const data = await res.json();

  expect(res.status).toBe(500);
  expect(data.error).toBe("Middleware Logic Error");
  expect(data.hint).toContain("await next()");
  expect(data.message).toContain("did not await it");
});

test("Safeguard: Correctly awaited next() should pass", async () => {
  const res = await fetch(`${BaseURL}/safeguard/ok`);
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.status).toBe("ok");
});