// PATH: /home/jacex/src/xerus/servers/http/9_middlewareErrors.test.ts

import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("MW Error: Middleware try/catch should intercept downstream error", async () => {
  const res = await fetch(`${BaseURL}/mw-err/catch-me`);
  const data = await res.json();

  // The mwSafeGuard middleware catches the error and sets 422
  expect(res.status).toBe(422);
  expect(data.safeGuard).toBe(true);
  expect(data.originalError).toBe("I am an error thrown in the handler");
});

test("MW Error: Uncaught error should bubble to global handler", async () => {
  const res = await fetch(`${BaseURL}/mw-err/bubble-up`);
  const data = await res.json();

  // The global handler (from 6_errorHandling.ts) sets status 500
  expect(res.status).toBe(500);

  // ✅ Updated for new error envelope shape
  expect(data.error.message).toBe("Custom Global Handler");
  expect(data.error.detail).toBe("I should bubble to global handler");

  // Optional: ensure code exists if you want to enforce it
  expect(data.error.code).toBeTruthy();
});
