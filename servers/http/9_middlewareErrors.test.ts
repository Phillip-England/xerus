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
  expect(data.error).toBe("Custom Global Handler");
  expect(data.detail).toBe("I should bubble to global handler");
});