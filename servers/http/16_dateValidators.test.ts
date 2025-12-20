// PATH: /home/jacex/src/xerus/servers/http/16_dateValidators.test.ts

import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Date Validators: ISO date should pass", async () => {
  const res = await fetch(`${BaseURL}/validators/iso?date=2025-12-20`);
  const j = await res.json();

  expect(res.status).toBe(200);
  expect(j.ok).toBe(true);
  expect(j.date).toBe("2025-12-20");
});

test("Date Validators: ISO date should fail for non-ISO format", async () => {
  const res = await fetch(`${BaseURL}/validators/iso?date=12/20/2025`);
  const text = await res.text();

  expect(res.status).toBe(400);
  // Keep it loose to match your current validation error style
  expect(text).toContain("Validation Failed");
});

test("Date Validators: asDate should accept ISO string", async () => {
  const res = await fetch(`${BaseURL}/validators/date?value=2025-12-20`);
  const j = await res.json();

  expect(res.status).toBe(200);
  expect(j.ok).toBe(true);
  expect(typeof j.iso).toBe("string");
  expect(j.iso).toContain("2025-12-20");
  expect(typeof j.ms).toBe("number");
  expect(j.ms).toBeGreaterThan(0);
});

test("Date Validators: asDate should accept numeric timestamp string", async () => {
  // Dec 20, 2025 00:00:00 UTC = 1766188800000
  const res = await fetch(`${BaseURL}/validators/date?value=1766188800000`);
  const j = await res.json();

  expect(res.status).toBe(200);
  expect(j.ok).toBe(true);
  expect(j.iso).toContain("2025-12-20");
});

test("Date Validators: asDate should fail for invalid input", async () => {
  const res = await fetch(`${BaseURL}/validators/date?value=not-a-date`);
  const text = await res.text();

  expect(res.status).toBe(400);
  expect(text).toContain("Validation Failed");
});
