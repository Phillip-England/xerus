import { expect, test } from "bun:test";
import { BaseURL } from "./baseURL";

const mockEmbeddedFiles = {
  "/index.html": {
    content: "<html><body><h1>Home</h1></body></html>",
    type: "text/html",
  },
  "/styles/main.css": {
    content: "body { background: #000; }",
    type: "text/css",
  },
};

test("Static: GET /static-site/index.html should return correct content", async () => {
  const res = await fetch(`${BaseURL}/static-site/index.html`);
  const text = await res.text();

  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("text/html");
  expect(text).toContain("<h1>Home</h1>");
});

test("Static: GET /static-site/ should fallback to index.html", async () => {
  const res = await fetch(`${BaseURL}/static-site/`);
  const text = await res.text();

  expect(res.status).toBe(200);
  expect(text).toContain("<h1>Home</h1>");
});

test("Static: GET /static-site/styles/main.css should return CSS", async () => {
  const res = await fetch(`${BaseURL}/static-site/styles/main.css`);
  const text = await res.text();

  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("text/css");
  expect(text).toBe(mockEmbeddedFiles["/styles/main.css"].content);
});

test("Static Prefixed: GET /assets/index.html should work", async () => {
  const res = await fetch(`${BaseURL}/assets/index.html`);
  expect(res.status).toBe(200);
});