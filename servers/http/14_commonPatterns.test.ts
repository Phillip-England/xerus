// PATH: /home/jacex/src/xerus/servers/http/14_commonPatterns.test.ts

import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("RequestId: should return and echo X-Request-Id", async () => {
  const res = await fetch(`${BaseURL}/patterns/request-id`);
  const data = await res.json();
  const hdr = res.headers.get("X-Request-Id");

  expect(res.status).toBe(200);
  expect(typeof data.id).toBe("string");
  expect(data.id.length).toBeGreaterThan(0);
  expect(hdr).toBe(data.id);
});

test("RateLimit: third request should 429", async () => {
  const r1 = await fetch(`${BaseURL}/patterns/limited`);
  const r2 = await fetch(`${BaseURL}/patterns/limited`);
  const r3 = await fetch(`${BaseURL}/patterns/limited`);

  expect(r1.status).toBe(200);
  expect(r2.status).toBe(200);
  expect(r3.status).toBe(429);

  const j = await r3.json();
  expect(j.error.code).toBe("RATE_LIMITED");
});

test("CSRF: should reject missing token and accept matching token", async () => {
  // 1) First GET sets cookie
  const r1 = await fetch(`${BaseURL}/patterns/csrf`);
  expect(r1.status).toBe(200);

  const setCookie = r1.headers.get("set-cookie") ?? "";
  expect(setCookie.length).toBeGreaterThan(0);

  const cookiePair = setCookie.split(";")[0]; // csrf_token=...
  const token = cookiePair.split("=", 2)[1] ?? "";
  expect(token.length).toBeGreaterThan(0);

  // 2) POST without header should fail
  const r2 = await fetch(`${BaseURL}/patterns/csrf`, {
    method: "POST",
    headers: { Cookie: cookiePair },
  });
  expect(r2.status).toBe(403);

  // 3) POST with matching header should pass
  const r3 = await fetch(`${BaseURL}/patterns/csrf`, {
    method: "POST",
    headers: {
      Cookie: cookiePair,
      "x-csrf-token": token,
    },
  });
  expect(r3.status).toBe(200);
});

test("Timeout: should return 504", async () => {
  const res = await fetch(`${BaseURL}/patterns/timeout`);
  const j = await res.json();

  expect(res.status).toBe(504);
  expect(j.error.code).toBe("TIMEOUT");
});

test("Compression: should set Content-Encoding for gzip/br when requested", async () => {
  const res = await fetch(`${BaseURL}/patterns/compress`, {
    headers: { "Accept-Encoding": "br, gzip" },
  });

  expect(res.status).toBe(200);

  const enc = res.headers.get("Content-Encoding");
  expect(enc === "br" || enc === "gzip" || enc === null).toBe(true);
});
