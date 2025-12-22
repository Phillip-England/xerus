import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

// 1. Header Validation
test("Flexible: HEADER validation should pass with correct key", async () => {
  const res = await fetch(`${BaseURL}/flex/header`, {
    headers: { "X-Secret": "xerus-power" },
  });
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.status).toBe("ok");
});

test("Flexible: HEADER validation should fail with wrong key", async () => {
  const res = await fetch(`${BaseURL}/flex/header`, {
    headers: { "X-Secret": "wrong" },
  });
  expect(res.status).toBe(400); // Trigger validation error
});

// 2. Param Validation (:id)
test("Flexible: PARAM validation should parse and validate numeric ID", async () => {
  const res = await fetch(`${BaseURL}/flex/param/123`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.id).toBe(123);
});

test("Flexible: PARAM validation should fail non-numeric ID", async () => {
  const res = await fetch(`${BaseURL}/flex/param/abc`);
  expect(res.status).toBe(400);
});

// 3. Specific Query Key Validation (?page=)
test("Flexible: QUERY key validation should pass valid number", async () => {
  const res = await fetch(`${BaseURL}/flex/query?page=5`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.page).toBe(5);
});

test("Flexible: QUERY key validation should fail invalid number", async () => {
  const res = await fetch(`${BaseURL}/flex/query?page=0`); // Min is 1
  expect(res.status).toBe(400);
});
