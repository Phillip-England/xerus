import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Precedence: /conflict/static should hit exact match", async () => {
  const res = await fetch(`${BaseURL}/conflict/static`);
  const data = await res.json();
  expect(data.type).toBe("exact");
});

test("Precedence: /conflict/dynamic should hit param match", async () => {
  const res = await fetch(`${BaseURL}/conflict/dynamic`);
  const data = await res.json();
  expect(data.type).toBe("param");
  expect(data.val).toBe("dynamic");
});

test("Precedence: /fallback/folder/valid should match exact path", async () => {
  const res = await fetch(`${BaseURL}/fallback/folder/valid`);
  const data = await res.json();
  expect(data.type).toBe("deep-exact");
});

test("Precedence: /fallback/other/valid should match param path", async () => {
  const res = await fetch(`${BaseURL}/fallback/other/valid`);
  const data = await res.json();
  expect(data.type).toBe("deep-param");
  expect(data.id).toBe("other");
});

test("Precedence: Wildcard should capture non-matching paths", async () => {
  const res = await fetch(`${BaseURL}/wild/anything-else`);
  const data = await res.json();
  expect(data.type).toBe("wildcard");
});

test("Precedence: Exact should still beat Wildcard", async () => {
  const res = await fetch(`${BaseURL}/wild/a`);
  const data = await res.json();
  expect(data.type).toBe("exact-a");
});

test("Precedence: /mixed/static should fall through to /mixed/:id if no exact handler exists", async () => {
  const res = await fetch(`${BaseURL}/mixed/static`);
  const data = await res.json();
  expect(data.type).toBe("param-mixed");
  expect(data.id).toBe("static");
});
