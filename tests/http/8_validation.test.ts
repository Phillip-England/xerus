import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

async function readMaybeError(res: Response) {
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("application/json")) return await res.json();
  return await res.text();
}

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
  expect(res.status).toBe(400);
  const body = await readMaybeError(res);
  if (typeof body === "string") {
    expect(body).toContain("Validation");
  } else {
    const err = body?.error ?? body;
    expect(err?.code).toBeTruthy();
    expect(String(err?.code)).toContain("VALIDATION");
  }
});

test("Validator: QUERY - Valid params should pass", async () => {
  const res = await fetch(`${BaseURL}/validation/search?q=bun&limit=50`);
  const json = await res.json();
  expect(res.status).toBe(200);
  expect(json.search.q).toBe("bun");
  expect(json.search.limit).toBe(50);
});

test("Validator: QUERY - Missing required param should fail", async () => {
  const res = await fetch(`${BaseURL}/validation/search?limit=50`);
  expect(res.status).toBe(400);
  const body = await readMaybeError(res);
  if (typeof body === "string") {
    expect(body).toContain("Search query is required");
  } else {
    const err = body?.error ?? body;
    expect(String(err?.detail ?? err?.message ?? "")).toContain(
      "Search query is required",
    );
  }
});

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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "password" }),
  });
  expect(res.status).toBe(400);
  const body = await readMaybeError(res);
  if (typeof body === "string") {
    expect(body).toContain("Unexpected JSON data");
  } else {
    const err = body?.error ?? body;
    expect(String(err?.message ?? err?.detail ?? "")).toContain("Unexpected JSON");
  }
});
