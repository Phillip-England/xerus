import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("HTTPContext: JSON -> TEXT should return same raw payload", async () => {
  const payload = { a: 1, b: "two" };
  const res = await fetch(`${BaseURL}/ctx/reparse/json-then-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await res.json();
  expect(res.status).toBe(200);
  expect(j.ok).toBe(true);
  expect(j.json).toEqual(payload);
  expect(typeof j.raw).toBe("string");
  expect(j.raw).toBe(JSON.stringify(payload));
});

test("HTTPContext: JSON -> FORM should be blocked", async () => {
  const res = await fetch(`${BaseURL}/ctx/reparse/json-then-form`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x: 1 }),
  });
  const j = await res.json();
  expect(res.status).toBe(400);
  expect(j.error.code).toBe("BODY_PARSING_FAILED");
  expect(j.error.message).toContain("BODY_PARSING_FAILED");
});

test("HTTPContext: FORM -> JSON should be blocked", async () => {
  const res = await fetch(`${BaseURL}/ctx/reparse/form-then-json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "x=1&y=2",
  });
  const j = await res.json();
  expect(res.status).toBe(400);
  expect(j.error.code).toBe("BODY_PARSING_FAILED");
  expect(j.error.message).toContain("BODY_PARSING_FAILED");
});

test("HTTPContext: MULTIPART -> JSON should be blocked", async () => {
  const fd = new FormData();
  fd.append("a", "1");
  const res = await fetch(`${BaseURL}/ctx/reparse/multipart-then-json`, {
    method: "POST",
    body: fd,
  });
  const j = await res.json();
  expect(res.status).toBe(400);
  expect(j.error.code).toBe("BODY_PARSING_FAILED");
  expect(j.error.message).toContain("BODY_PARSING_FAILED");
});

test("HTTPContext: Header newline injection should throw 500 INTERNAL_SERVER_ERROR", async () => {
  const res = await fetch(`${BaseURL}/ctx/header/newline`);
  const j = await res.json();
  expect(res.status).toBe(500);
  expect(j.error.code).toBe("INTERNAL_SERVER_ERROR");
  expect(j.error.message).toBe("Internal Server Error");
  expect(j.error.detail).toContain("Attempted to set invalid header");
});
