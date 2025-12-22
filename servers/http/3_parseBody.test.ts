import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

async function readMaybeError(res: Response) {
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("application/json")) return await res.json();
  return await res.text();
}

function expectBodyParsingFailed(body: any) {
  if (typeof body === "string") {
    expect(body).toContain("BODY_PARSING_FAILED");
    return;
  }
  const err = body?.error ?? body;
  expect(err?.code).toBe("BODY_PARSING_FAILED");
  // message/detail may vary by implementation
}

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

  expect(res.status).toBe(400);
  const body = await readMaybeError(res);
  expectBodyParsingFailed(body);
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
    body: formData,
  });

  const json = await res.json();
  expect(res.status).toBe(200);
  expect(json.data).toEqual({ field1: "value1", field2: "value2" });
});

test("parseBody: Should error if Content-Type does not match expectation", async () => {
  const res = await fetch(`${BaseURL}/parse/form`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ test: "data" }),
  });

  expect(res.status).toBe(400);
  const body = await readMaybeError(res);

  if (typeof body === "string") {
    expect(body).toContain("Unexpected JSON data");
  } else {
    const err = body?.error ?? body;
    expect(err?.code).toBeTruthy();
    expect(String(err?.message ?? err?.detail ?? "")).toContain("Unexpected JSON");
  }
});
