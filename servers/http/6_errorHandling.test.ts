// PATH: /home/jacex/src/xerus/servers/http/6_errorHandling.test.ts

import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

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
  expect(data.error.detail).toBe("Failure in Middleware");
});

test("Errors: Non-existent route should trigger SystemErr (404)", async () => {
  const res = await fetch(`${BaseURL}/err/does-not-exist`);
  const text = await res.text();

  expect(res.status).toBe(404);
  // This verifies SystemErrRecord[SystemErrCode.ROUTE_NOT_FOUND] logic
  expect(text).toContain("is not registered");
});

test("Errors: Accessing missing file should trigger SystemErr (404)", async () => {
  const res = await fetch(`${BaseURL}/err/file-missing`);
  expect(res.status).toBe(404);
});
