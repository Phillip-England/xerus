// PATH: /home/jacex/src/xerus/servers/http/10_safeguard.test.ts

import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Safeguard: Non-awaited next() should trigger 500 SystemErr", async () => {
  const res = await fetch(`${BaseURL}/safeguard/fail`);
  const data = await res.json();

  expect(res.status).toBe(500);

  // ✅ New canonical error envelope
  expect(data.error.message).toBe("Middleware Logic Error");
  expect(data.error.hint).toContain("await next()");
  expect(data.error.detail).toContain("did not await it");
  expect(data.error.code).toBe("MIDDLEWARE_ERROR");
});

test("Safeguard: Correctly awaited next() should pass", async () => {
  const res = await fetch(`${BaseURL}/safeguard/ok`);
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.status).toBe("ok");
});
