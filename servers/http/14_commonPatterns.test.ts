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
  // Get token + cookie
  const tokenRes = await fetch(`${BaseURL}/patterns/csrf-token`);
  const tokenJson = await tokenRes.json();

  expect(tokenRes.status).toBe(200);
  expect(typeof tokenJson.token).toBe("string");
  expect(tokenJson.token.length).toBeGreaterThan(0);

  const setCookie = tokenRes.headers.get("Set-Cookie");
  expect(setCookie).toContain("csrf_token=");

  // Missing header should fail
  const bad = await fetch(`${BaseURL}/patterns/protected`, {
    method: "POST",
    headers: {
      "Cookie": setCookie!,
    },
  });
  expect(bad.status).toBe(403);

  // Matching header should pass
  const ok = await fetch(`${BaseURL}/patterns/protected`, {
    method: "POST",
    headers: {
      "Cookie": setCookie!,
      "x-csrf-token": tokenJson.token,
    },
  });
  const okJson = await ok.json();
  expect(ok.status).toBe(200);
  expect(okJson.ok).toBe(true);
});

test("Timeout: should return 504", async () => {
  const res = await fetch(`${BaseURL}/patterns/timeout`);
  const j = await res.json();
  expect(res.status).toBe(504);
  expect(j.error.code).toBe("TIMEOUT");
});

test("Compression: should set Content-Encoding for gzip/br when requested", async () => {
  const res = await fetch(`${BaseURL}/patterns/compress`, {
    headers: { "Accept-Encoding": "gzip" },
  });

  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Encoding")).toBe("gzip");

  const txt = await res.text();
  expect(txt.length).toBe(5000);
});
