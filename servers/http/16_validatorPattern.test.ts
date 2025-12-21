import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Validator Pattern: Should resolve valid data using c.resolve()", async () => {
  const res = await fetch(`${BaseURL}/validator/pattern?page=5`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.page).toBe(5);
});

test("Validator Pattern: Should fail validation logic defined in TypeValidator", async () => {
  const res = await fetch(`${BaseURL}/validator/pattern?page=0`);
  const data = await res.json();
  expect(res.status).toBe(400);
  expect(data.error.code).toBe("VALIDATION_FAILED");
  // Updated expectation to match SystemErr behavior (Code: Message)
  expect(data.error.detail).toBe("VALIDATION_FAILED: Page must be >= 1");
});

test("Validator Pattern: Should use default value if missing", async () => {
  const res = await fetch(`${BaseURL}/validator/pattern`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.page).toBe(1);
});