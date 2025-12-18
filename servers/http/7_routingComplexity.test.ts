import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Routing: Should prioritize exact match over parameter", async () => {
  const res = await fetch(`${BaseURL}/users/me`);
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.type).toBe("exact");
  expect(data.identity).toBe("myself");
});

test("Routing: Should correctly capture dynamic path parameter", async () => {
  const res = await fetch(`${BaseURL}/users/12345`);
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.type).toBe("param");
  expect(data.identity).toBe("12345");
});

test("Routing: Should capture multiple nested parameters", async () => {
  const res = await fetch(`${BaseURL}/org/xerus-inc/project/core-lib`);
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.org).toBe("xerus-inc");
  expect(data.project).toBe("core-lib");
});

test("Routing: Should handle simple wildcard greedy match", async () => {
  const res = await fetch(`${BaseURL}/public/images/logo.png`);
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.path).toBe("/public/images/logo.png");
  expect(data.message).toBe("wildcard matched");
});

test("Routing: Should handle deep wildcard match", async () => {
  const res = await fetch(`${BaseURL}/api/v1/docs/intro/getting-started`);
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.scope).toBe("docs-wildcard");
});