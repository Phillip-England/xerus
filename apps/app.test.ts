import { expect, test } from "bun:test";

const BASE_URL = "http://localhost:8080";

test("GET / should return Hello, world!", async () => {
  const res = await fetch(`${BASE_URL}/`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.message).toBe("Hello, world!");
});

test("GET /time should return current time", async () => {
  const res = await fetch(`${BASE_URL}/time`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(typeof data.time).toBe("string");
});

test("GET /user/:id should return user details", async () => {
  const res = await fetch(`${BASE_URL}/user/123`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.userId).toBe("123");
  expect(data.name).toBe("Test User");
});

test("PUT /user/:id should update user", async () => {
  const res = await fetch(`${BASE_URL}/user/123`, {
    method: "PUT",
    body: JSON.stringify({ name: "Updated User" }),
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.message).toBe("User 123 updated");
  expect(data.data.name).toBe("Updated User");
});

test("DELETE /user/:id should return deletion message", async () => {
  const res = await fetch(`${BASE_URL}/user/123`, { method: "DELETE" });
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.message).toBe("User 123 deleted");
});

test("GET /query should return query parameters", async () => {
  const res = await fetch(`${BASE_URL}/query?foo=bar&baz=qux`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.query.foo).toBe("bar");
  expect(data.query.baz).toBe("qux");
});

test("GET /headers should return request headers", async () => {
  const res = await fetch(`${BASE_URL}/headers`, { headers: { "X-Test": "test-value" } });
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.headers["x-test"]).toBe("test-value");
});

test("POST /json should return received JSON", async () => {
  const res = await fetch(`${BASE_URL}/json`, {
    method: "POST",
    body: JSON.stringify({ test: "data" }),
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.received.test).toBe("data");
});

test("GET /error should return 500 error", async () => {
  const res = await fetch(`${BASE_URL}/error`);
  expect(res.status).toBe(500);
});
