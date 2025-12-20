import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

// 1. JSON Validation
test("Validator: JSON - Valid payload should pass", async () => {
  const payload = { username: "xerus_dev", email: "dev@xerus.io", age: 25 };
  const res = await fetch(`${BaseURL}/validation/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  expect(res.status).toBe(200);
  expect(json.user.name).toBe("xerus_dev");
});

test("Validator: JSON - Invalid payload should fail", async () => {
  const payload = { username: "no", email: "bad-email", age: 10 };
  const res = await fetch(`${BaseURL}/validation/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  expect(res.status).toBe(400);
  expect(text).toContain("Validation Failed");
});

// 2. Query Validation
test("Validator: QUERY - Valid params should pass", async () => {
  const res = await fetch(`${BaseURL}/validation/search?q=bun&limit=50`);
  const json = await res.json();
  expect(res.status).toBe(200);
  expect(json.search.q).toBe("bun");
  expect(json.search.limit).toBe(50);
});

test("Validator: QUERY - Missing required param should fail", async () => {
  const res = await fetch(`${BaseURL}/validation/search?limit=50`); // Missing 'q'
  const text = await res.text();
  expect(res.status).toBe(400);
  expect(text).toContain("Search query is required");
});

// 3. Form Validation
test("Validator: FORM - Valid url-encoded form should pass", async () => {
  const res = await fetch(`${BaseURL}/validation/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "username=admin&password=secretpassword",
  });
  const json = await res.json();
  expect(res.status).toBe(200);
  expect(json.msg).toBe("Welcome admin");
});

test("Validator: FORM - Invalid content type (sending JSON instead of FORM) should fail", async () => {
  const res = await fetch(`${BaseURL}/validation/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // Wrong type for this validator
    body: JSON.stringify({ username: "admin", password: "password" }),
  });
  const text = await res.text();
  expect(res.status).toBe(400);
  expect(text).toContain("Unexpected JSON data"); // Triggered by c.parseBody(BodyType.FORM) check
});