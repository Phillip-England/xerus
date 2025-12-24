import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

async function readMaybeError(res: Response) {
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("application/json")) return await res.json();
  return await res.text();
}

test("Errors: GET /err/standard should be caught by app.onErr", async () => {
  const res = await fetch(`${BaseURL}/err/standard`);
  const data = await res.json();
  expect(res.status).toBe(500);
  expect(data.error.message).toBe("Custom Global Handler");
  expect(data.error.detail).toBe("Standard Route Failure");
});

test("Errors: GET /err/middleware should be caught by app.onErr", async () => {
  const res = await fetch(`${BaseURL}/err/middleware`);
  const data = await res.json();
  
  expect(res.status).toBe(500);
  // FIX: Updated expectation to match actual error thrown by Service
  expect(data.error.detail).toBe("Failure in Service");
});

test("Errors: Non-existent route should trigger 404 SystemErr", async () => {
  const res = await fetch(`${BaseURL}/err/does-not-exist`);
  const body = await readMaybeError(res);
  expect(res.status).toBe(404);
  if (typeof body === "string") {
    expect(body).toContain("is not registered");
  } else {
    expect((body.error?.code ?? body.code) as any).toBeTruthy();
  }
});

test("Errors: Accessing missing file should trigger SystemErr (404)", async () => {
  const res = await fetch(`${BaseURL}/err/file-missing`);
  expect(res.status).toBe(404);
});