import { expect, test } from "bun:test";
import { BaseURL } from "./baseURL";


test("parseBody: JSON should parse valid object", async () => {
  const payload = { hello: "world", xerus: true };
  const res = await fetch(`${BaseURL}/parse/json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();

  expect(res.status).toBe(200);
  expect(json.data).toEqual(payload);
});

test("parseBody: JSON should fail on invalid syntax", async () => {
  const res = await fetch(`${BaseURL}/parse/json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ invalid: json }",
  });
  const text = await res.text();

  expect(res.status).toBe(400);
  expect(text).toContain("BODY_PARSING_FAILED");
});

test("parseBody: TEXT should parse plain string", async () => {
  const payload = "Hello Xerus!";
  const res = await fetch(`${BaseURL}/parse/text`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: payload,
  });
  const json = await res.json();

  expect(res.status).toBe(200);
  expect(json.data).toBe(payload);
});

test("parseBody: FORM should parse URL-encoded data", async () => {
  const res = await fetch(`${BaseURL}/parse/form`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "username=jacex&role=admin",
  });
  const json = await res.json();

  expect(res.status).toBe(200);
  expect(json.data).toEqual({ username: "jacex", role: "admin" });
});

test("parseBody: MULTIPART should parse FormData", async () => {
  const formData = new FormData();
  formData.append("field1", "value1");
  formData.append("field2", "value2");

  const res = await fetch(`${BaseURL}/parse/multipart`, {
    method: "POST",
    body: formData, // Fetch automatically sets multipart boundary header
  });
  const json = await res.json();

  expect(res.status).toBe(200);
  expect(json.data).toEqual({ field1: "value1", field2: "value2" });
});

test("parseBody: Should throw error if Content-Type does not match expectation", async () => {
  // Sending JSON but asking the framework to parse as FORM
  const res = await fetch(`${BaseURL}/parse/form`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ test: "data" }),
  });
  const text = await res.text();

  expect(res.status).toBe(400);
  expect(text).toContain("Unexpected JSON data");
});