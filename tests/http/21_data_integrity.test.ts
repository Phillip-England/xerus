import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Integrity: Query should capture multiple values for same key", async () => {
  const res = await fetch(`${BaseURL}/integrity/query-array?id=1&id=2&id=3`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.ids).toEqual(["1", "2", "3"]);
});

test("Integrity: Form should parse multiple values when formMode='multi'", async () => {
  const res = await fetch(`${BaseURL}/integrity/form-multi`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "tag=a&tag=b&user=me",
  });
  const json = await res.json();
  expect(res.status).toBe(200);
  // "tag" should be array, "user" should be string
  expect(json.data.tag).toEqual(["a", "b"]);
  expect(json.data.user).toBe("me");
});

test("Integrity: Empty body parsed as JSON should trigger error handling", async () => {
  const res = await fetch(`${BaseURL}/integrity/empty-json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "", // Empty string
  });
  const json = await res.json();
  // Expecting the try/catch in route to handle it
  expect(json.empty).toBe(true);
  expect(json.error).toContain("JSON parsing failed");
});
