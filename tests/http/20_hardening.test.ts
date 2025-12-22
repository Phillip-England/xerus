import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Hardening: Object Pool should strictly reset context between requests", async () => {
  await fetch(`${BaseURL}/harden/pollution/set`);
  const res = await fetch(`${BaseURL}/harden/pollution/check`);
  const data = await res.json();
  expect(data.polluted).toBe(false);
  expect(data.value).toBeUndefined();
});

test("Hardening: Service init() failure should trigger 500 error", async () => {
  const res = await fetch(`${BaseURL}/harden/service-fail`);
  const data = await res.json();
  expect(res.status).toBe(500);
  expect(data.error.detail).toBe("Database Connection Failed inside Service");
});

test("Hardening: Middleware calling next() twice should be caught", async () => {
  const res = await fetch(`${BaseURL}/harden/double-next`);
  expect(res.status).toBe(500);
  const data = await res.json();
  expect(data.error.detail).toContain("next() called multiple times");
});

test("Hardening: Headers should be mutable after body written (Onion Pattern support)", async () => {
  const res = await fetch(`${BaseURL}/harden/late-header`);
  expect(res.status).toBe(200);
  // Framework design allows post-handler header modification
  expect(res.headers.get("X-Late")).toBe("Too late"); 
});

test("Hardening: Headers should be IMMUTABLE after Streaming starts", async () => {
  const res = await fetch(`${BaseURL}/harden/stream-safety`);
  expect(res.status).toBe(200);
  const text = await res.text();
  expect(text).toBe("stream data");
  // Ensure the header set AFTER stream() call was blocked
  expect(res.headers.get("X-Fail")).toBeNull();
});

test("Hardening: Duplicate route registration should throw at startup", async () => {
  const { Xerus } = await import("../../src/Xerus");
  const { XerusRoute } = await import("../../src/XerusRoute");
  const { Method } = await import("../../src/Method");
  class A extends XerusRoute {
    method = Method.GET;
    path = "/duplicate";
    async handle(c: any) {}
  }
  const app = new Xerus();
  app.mount(A);
  expect(() => {
    app.mount(A); 
  }).toThrow("ROUTE_ALREADY_REGISTERED");
});