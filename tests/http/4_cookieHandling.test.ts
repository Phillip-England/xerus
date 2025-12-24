import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Cookies: GET /cookies/set should return Set-Cookie header", async () => {
  const res = await fetch(`${BaseURL}/cookies/set`);
  const setCookie = res.headers.get("Set-Cookie");
  expect(res.status).toBe(200);
  expect(setCookie).toContain("theme=dark");
  expect(setCookie).toContain("HttpOnly");
  expect(setCookie).toContain("Path=/");
});

test("Cookies: GET /cookies/set-complex should set multiple distinct headers", async () => {
  const res = await fetch(`${BaseURL}/cookies/set-complex`);
  const cookies = res.headers.getSetCookie();
  expect(cookies.length).toBe(2);
  expect(cookies[0]).toContain("session_id=12345");
  expect(cookies[0]).toContain("Secure");
  expect(cookies[0]).toContain("SameSite=Strict");
  expect(cookies[0]).toContain("Max-Age=3600");
  expect(cookies[1]).toContain("preferences=compact");
  expect(cookies[1]).toContain("Path=/admin");
});

test("Cookies: GET /cookies/get should parse incoming Cookie header", async () => {
  const res = await fetch(`${BaseURL}/cookies/get`, {
    headers: {
      Cookie: "theme=light; other=value",
    },
  });
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.theme).toBe("light");
});

test("Cookies: GET /cookies/get should return undefined for missing cookie", async () => {
  const res = await fetch(`${BaseURL}/cookies/get`);
  const data = await res.json();
  expect(data.theme).toBeUndefined();
});

test("Cookies: GET /cookies/clear should set expiration in the past", async () => {
  const res = await fetch(`${BaseURL}/cookies/clear`);
  const setCookie = res.headers.get("Set-Cookie");
  expect(setCookie).toContain("theme=");
  expect(setCookie).toContain("Max-Age=0");
  expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
});
