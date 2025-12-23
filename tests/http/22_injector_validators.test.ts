// /Users/phillipengland/src/xerus/tests/http/22_injector_validators.test.ts
import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Injector+Validators: injected service should share the same validator instance as c.data(Type)", async () => {
  const res = await fetch(`${BaseURL}/injector-validator?q=hello`);
  const j = await res.json();

  expect(res.status).toBe(200);
  expect(j.fromSvc).toBe("hello");
  expect(j.fromData).toBe("hello");
  expect(j.sameInstance).toBe(true);
  expect(j.computed).toBe("computed:hello");
});

test("Injector+Validators: should not leak across requests (computed should track current request)", async () => {
  const r1 = await fetch(`${BaseURL}/injector-validator?q=A`);
  const j1 = await r1.json();
  expect(r1.status).toBe(200);
  expect(j1.fromSvc).toBe("A");
  expect(j1.computed).toBe("computed:A");

  const r2 = await fetch(`${BaseURL}/injector-validator?q=B`);
  const j2 = await r2.json();
  expect(r2.status).toBe(200);
  expect(j2.fromSvc).toBe("B");
  expect(j2.computed).toBe("computed:B");
});

test("Injector+Validators: missing query param should default via c.query fallback", async () => {
  const res = await fetch(`${BaseURL}/injector-validator`);
  const j = await res.json();

  expect(res.status).toBe(200);
  expect(j.fromSvc).toBe("");
  expect(j.fromData).toBe("");
  expect(j.sameInstance).toBe(true);
  expect(j.computed).toBe("computed:");
});
