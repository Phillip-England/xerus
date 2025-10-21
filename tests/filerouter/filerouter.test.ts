import { expect, test } from "bun:test";

const BASE_URL = "http://localhost:8080";

test("GET / should return Hello, world!", async () => {
  const res = await fetch(`${BASE_URL}/`);
  const data = await res.text();
  expect(res.status).toBe(200);
  expect(data).toBe("<h1>Hello, World!</h1>");
});

test("GET /static/index.js should return a simple console log", async () => {
  const res = await fetch(`${BASE_URL}/static/index.js`);
  const data = await res.text();
  expect(res.status).toBe(200);
  expect(data).toBe('console.log("hello world!");\n');
});

test("GET /about should return <h1>About Me, With Middleware!</h1>", async () => {
  const res = await fetch(`${BASE_URL}/about`);
  const data = await res.text();
  expect(res.status).toBe(200);
  expect(data).toBe("<h1>About Me, With Middleware!</h1>");
});

test("GET /about/impacted should return <h1>About Me, With Middleware!</h1>", async () => {
  const res = await fetch(`${BASE_URL}/about/impacted`);
  const data = await res.text();
  expect(res.status).toBe(200);
  expect(data).toBe("<h1>About Me, With Middleware!</h1>");
});

test("GET /user/1 should return <h1>Hello, User <!-- -->1</h1>", async () => {
  const res = await fetch(`${BASE_URL}/user/1`);
  const data = await res.text();
  expect(res.status).toBe(200);
  expect(data).toBe("<h1>Hello, User <!-- -->1</h1>");
});

test("GET /user/2 should return <h1>Hello, User <!-- -->2</h1>", async () => {
  const res = await fetch(`${BASE_URL}/user/2`);
  const data = await res.text();
  expect(res.status).toBe(200);
  expect(data).toBe("<h1>Hello, User <!-- -->2</h1>");
});