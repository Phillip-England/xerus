import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Validator: Valid payload should pass and return data", async () => {
  const payload = {
    username: "xerus_dev",
    email: "dev@xerus.io",
    age: 25
  };

  const res = await fetch(`${BaseURL}/validation/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  expect(res.status).toBe(200);
  expect(json.status).toBe("success");
  expect(json.user.name).toBe("xerus_dev");
});

test("Validator: Zod failure should return 400 and formatted message", async () => {
  const payload = {
    username: "no", // Too short (min 3)
    email: "not-an-email", // Invalid email
    age: 10 // Too young (min 18)
  };

  const res = await fetch(`${BaseURL}/validation/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  expect(res.status).toBe(400); // SystemErrCode.BODY_PARSING_FAILED maps to 400
  expect(text).toContain("Validation Failed");
  expect(text).toContain("username: Username must be at least 3 chars");
  expect(text).toContain("email: Invalid email format");
  expect(text).toContain("age: Must be 18 or older");
});

test("Validator: Manual error throw should return 400", async () => {
  const payload = { code: "wrong-code" };

  const res = await fetch(`${BaseURL}/validation/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  expect(res.status).toBe(400);
  expect(text).toContain("Invalid secret code");
});

test("Validator: Malformed JSON should fail before validation logic", async () => {
  const res = await fetch(`${BaseURL}/validation/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ bad json ",
  });

  const text = await res.text();

  // parsing happens inside c.parseBody called by Validator
  expect(res.status).toBe(400); 
  expect(text).toContain("JSON parsing failed");
});