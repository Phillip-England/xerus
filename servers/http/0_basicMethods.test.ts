import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

async function readMaybeError(res: Response) {
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("application/json")) {
    return await res.json();
  }
  return await res.text();
}

test("GET / should return Hello, world!", async () => {
  const res = await fetch(`${BaseURL}/`);
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.message).toBe("Hello, world!");
});

test("POST /items should return 201 and the created data", async () => {
  const payload = { name: "New Item" };
  const res = await fetch(`${BaseURL}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  expect(res.status).toBe(201);
  expect(data.message).toBe("Item created");
  expect(data.data.name).toBe("New Item");
});

test("PUT /items/1 should return updated data", async () => {
  const payload = { name: "Updated Item" };
  const res = await fetch(`${BaseURL}/items/1`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.message).toBe("Item 1 updated");
  expect(data.data.name).toBe("Updated Item");
});

test("DELETE /items/1 should return success message", async () => {
  const res = await fetch(`${BaseURL}/items/1`, { method: "DELETE" });
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.message).toBe("Item 1 deleted");
});

test("Redirect: Simple redirect should return 302 and Location", async () => {
  const res = await fetch(`${BaseURL}/redir/simple`, { redirect: "manual" });

  expect(res.status).toBe(302);
  expect(res.headers.get("Location")).toBe("/");
});

test("Redirect: Should merge query params correctly", async () => {
  const res = await fetch(`${BaseURL}/redir/query`, { redirect: "manual" });
  const loc = res.headers.get("Location");

  expect(res.status).toBe(302);
  expect(loc).toContain("existing=1");
  expect(loc).toContain("new=2");
  expect(loc).toContain("&");
});

test("Redirect: Should auto-encode unsafe characters", async () => {
  const res = await fetch(`${BaseURL}/redir/unsafe`, { redirect: "manual" });
  const loc = res.headers.get("Location");

  expect(res.status).toBe(302);
  expect(loc).not.toContain("\r\n");
  expect(loc).toContain("Hack%0D%0ALocation%3A+google.com");
});

test("Basics: 404 should return SystemErr for unknown route", async () => {
  const res = await fetch(`${BaseURL}/does-not-exist`);
  const body = await readMaybeError(res);

  expect(res.status).toBe(404);

  if (typeof body === "string") {
    expect(body).toContain("is not registered");
  } else {
    expect(body.error?.code ?? body.code).toBeTruthy();
  }
});

test("Basics: Unknown method on known path should still 404 (no implicit method fallback)", async () => {
  const res = await fetch(`${BaseURL}/items`, { method: "GET" });
  const body = await readMaybeError(res);

  expect(res.status).toBe(404);

  if (typeof body === "string") {
    expect(body).toContain("is not registered");
  } else {
    expect(body.error?.code ?? body.code).toBeTruthy();
  }
});

test("Basics: HEAD should return headers but no body", async () => {
  const res = await fetch(`${BaseURL}/basics/ping`, { method: "HEAD" });

  expect(res.status).toBe(200);
  expect(res.headers.get("X-Ping")).toBe("pong");

  const body = await res.text();
  expect(body).toBe("");
});

test("Basics: OPTIONS should return Allow header", async () => {
  const res = await fetch(`${BaseURL}/basics/ping`, { method: "OPTIONS" });
  const text = await res.text();

  expect(res.status).toBe(204);

  const allow = res.headers.get("Allow") ?? "";
  expect(allow).toContain("GET");
  expect(allow).toContain("HEAD");
  expect(allow).toContain("OPTIONS");

  expect(text).toBe("");
});

test("Basics: Query echo should return exact values", async () => {
  const res = await fetch(`${BaseURL}/basics/echo-query?a=hello&b=world`);
  const j = await res.json();

  expect(res.status).toBe(200);
  expect(j.a).toBe("hello");
  expect(j.b).toBe("world");
});

test("Basics: Missing query key should return null (not undefined) in JSON", async () => {
  const res = await fetch(`${BaseURL}/basics/echo-query?a=only`);
  const j = await res.json();

  expect(res.status).toBe(200);
  expect(j.a).toBe("only");
  expect(j.b).toBeNull();
});

test("Basics: Header echo should be case-insensitive and reflected as response header", async () => {
  const res = await fetch(`${BaseURL}/basics/echo-header`, {
    headers: { "x-test-header": "abc123" },
  });

  expect(res.status).toBe(200);
  expect(res.headers.get("X-Echo-Test")).toBe("abc123");

  const j = await res.json();
  expect(j.value).toBe("abc123");
});

test("Basics: setStatus chaining should work (418)", async () => {
  const res = await fetch(`${BaseURL}/basics/status`);
  const text = await res.text();

  expect(res.status).toBe(418);
  expect(text).toBe("teapot");
});

test("Basics: JSON should include Content-Type application/json", async () => {
  const res = await fetch(`${BaseURL}/basics/json`);
  const j = await res.json();

  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type") ?? "").toContain("application/json");
  expect(j.ok).toBe(true);
  expect(j.msg).toBe("✨ unicode ok");
});
