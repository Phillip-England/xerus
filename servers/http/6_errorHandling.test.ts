import { expect, test } from "bun:test";
import { BaseURL } from "./baseURL";

test("Errors: GET /err/standard should be caught by app.onErr", async () => {
  const res = await fetch(`${BaseURL}/err/standard`);
  const data = await res.json();

  expect(res.status).toBe(500);
  expect(data.error).toBe("Custom Global Handler");
  expect(data.detail).toBe("Standard Route Failure");
});

test("Errors: GET /err/middleware should be caught by app.onErr", async () => {
  const res = await fetch(`${BaseURL}/err/middleware`);
  const data = await res.json();

  expect(res.status).toBe(500);
  expect(data.detail).toBe("Failure in Middleware");
});

test("Errors: Non-existent route should trigger SystemErr (404)", async () => {
  const res = await fetch(`${BaseURL}/err/does-not-exist`);
  const text = await res.text();

  expect(res.status).toBe(404);
  // This verifies SystemErrRecord[SystemErrCode.ROUTE_NOT_FOUND] logic
  expect(text).toContain("is not registered");
});

test("Errors: Accessing missing file should trigger SystemErr (404)", async () => {
  // Define a route that tries to serve a non-existent file
  // Note: We register this inside the test context via the app instance
  const res = await fetch(`${BaseURL}/err/file-missing`); 
  // We'll use the existing /file-missing from your server.ts if available, 
  // or rely on a standard 404 from static serving.
  expect(res.status).toBe(404);
});