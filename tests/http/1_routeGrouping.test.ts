import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Group Prefix: GET /api/v1 should return version", async () => {
  const res = await fetch(`${BaseURL}/api/v1`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.version).toBe("v1");
});

test("Group Prefix: POST /api/echo should parse body correctly", async () => {
  const payload = { foo: "bar" };
  const res = await fetch(`${BaseURL}/api/echo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.received.foo).toBe("bar");
});

test("Group Middleware: GET /admin/dashboard should have group header", async () => {
  const res = await fetch(`${BaseURL}/admin/dashboard`);
  const text = await res.text();
  expect(res.status).toBe(200);
  expect(text).toBe("Welcome to the Dashboard");
  expect(res.headers.get("X-Group-Auth")).toBe("passed");
});

test("Group Method: DELETE /admin/settings should work in group", async () => {
  const res = await fetch(`${BaseURL}/admin/settings`, {
    method: "DELETE",
  });
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.deleted).toBe(true);
  expect(res.headers.get("X-Group-Auth")).toBe("passed");
});
