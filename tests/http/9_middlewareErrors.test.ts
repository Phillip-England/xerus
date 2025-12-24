import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("MW Error: Middleware try/catch should intercept downstream error", async () => {
  const res = await fetch(`${BaseURL}/mw-err/catch-me`);
  const data = await res.json();
  expect(res.status).toBe(422);
  expect(data.safeGuard).toBe(true);
  expect(data.originalError).toBe("I am an error thrown in the handler");
});

test("MW Error: Uncaught error should bubble to global handler", async () => {
  const res = await fetch(`${BaseURL}/mw-err/bubble-up`);
  const data = await res.json();
  expect(res.status).toBe(500);
  expect(data.error.message).toBe("Custom Global Handler");
  expect(data.error.detail).toBe("I should bubble to global handler");
  expect(data.error.code).toBeTruthy();
});
