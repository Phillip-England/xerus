import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

// 1. Conflict: Exact vs Param
// Routes: /conflict/static (Exact) AND /conflict/:id (Param)
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

// 2. Conflict: Fallback Behavior
// Route Structure:
// /fallback/:id/valid (Param -> Exact)
// /fallback/folder    (Exact, but NO HANDLER at this level, just a parent node)
//
// Request: /fallback/folder/valid
// Logic:
// 1. Matches 'fallback'
// 2. 'folder' matches Exact. Go down.
// 3. 'valid' matches Exact. Handlers check... FOUND!
test("Precedence: /fallback/folder/valid should match exact path", async () => {
  const res = await fetch(`${BaseURL}/fallback/folder/valid`);
  const data = await res.json();
  expect(data.type).toBe("deep-exact");
});

// Request: /fallback/other/valid
// Logic:
// 1. Matches 'fallback'
// 2. 'other' fails Exact. Matches Param (:id). Go down.
// 3. 'valid' matches Exact. Handlers check... FOUND!
test("Precedence: /fallback/other/valid should match param path", async () => {
  const res = await fetch(`${BaseURL}/fallback/other/valid`);
  const data = await res.json();
  expect(data.type).toBe("deep-param");
  expect(data.id).toBe("other");
});


// 3. Wildcard Precedence
// Routes: /wild/a (Exact), /wild/* (Wildcard)
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

// 4. The "Fallthrough" Case (Crucial Fix)
// Route: /mixed/:id
// Request: /mixed/static
// NOTE: /mixed/static is NOT registered, but 'static' might be a known segment elsewhere?
// If /mixed/static DOES NOT exist, it must hit /mixed/:id.
test("Precedence: /mixed/static should fall through to /mixed/:id if no exact handler exists", async () => {
  const res = await fetch(`${BaseURL}/mixed/static`);
  const data = await res.json();
  expect(data.type).toBe("param-mixed");
  expect(data.id).toBe("static");
});