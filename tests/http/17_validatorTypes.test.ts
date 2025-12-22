import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("ValidatorTypes: Query - success", async () => {
  const res = await fetch(`${BaseURL}/vtypes/query?q=bun&limit=5`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.term).toBe("bun");
});

test("ValidatorTypes: Query - fail", async () => {
  const res = await fetch(`${BaseURL}/vtypes/query?q=no`);
  const data = await res.json();
  expect(res.status).toBe(400);
  expect(data.error.detail).toContain("Query 'q' must be 3+ chars");
});

test("ValidatorTypes: Path - success", async () => {
  const res = await fetch(`${BaseURL}/vtypes/product/99`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.productId).toBe(99);
});

test("ValidatorTypes: JSON - success", async () => {
  const res = await fetch(`${BaseURL}/vtypes/json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", email: "admin@test.com" }),
  });
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.user).toBe("admin");
});

test("ValidatorTypes: Form - success", async () => {
  const res = await fetch(`${BaseURL}/vtypes/form`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "username=jdoe&password=123",
  });
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.login).toBe("jdoe");
});

test("ValidatorTypes: Custom - success", async () => {
  const res = await fetch(`${BaseURL}/vtypes/custom`, {
    headers: { "X-Api-Key": "secret-123" },
  });
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.authorized).toBe(true);
});

test("ValidatorTypes: Custom - fail", async () => {
  const res = await fetch(`${BaseURL}/vtypes/custom`, {
    headers: { "X-Api-Key": "wrong" },
  });
  expect(res.status).toBe(400);
});
