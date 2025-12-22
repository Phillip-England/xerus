import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

const mockEmbeddedFiles = {
  "/index.html": {
    content: "<html><body><h1>Home</h1></body></html>",
    type: "text/html",
  },
  "/styles/main.css": {
    content: "body { background: #000; }",
    type: "text/css",
  },
  "/images/logo.png": {
    content: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    type: "image/png",
  },
};

// --- Tests for Memory/Embedded Files ---

test("Embed: GET /static-site/index.html should return correct content", async () => {
  const res = await fetch(`${BaseURL}/static-site/index.html`);
  const text = await res.text();

  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("text/html");
  expect(text).toContain("<h1>Home</h1>");
});

test("Embed: GET /static-site/ should fallback to index.html", async () => {
  const res = await fetch(`${BaseURL}/static-site/`);
  const text = await res.text();

  expect(res.status).toBe(200);
  expect(text).toContain("<h1>Home</h1>");
});

test("Embed: GET /static-site/styles/main.css should return CSS", async () => {
  const res = await fetch(`${BaseURL}/static-site/styles/main.css`);
  const text = await res.text();

  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("text/css");
  // @ts-ignore
  expect(text).toBe(mockEmbeddedFiles["/styles/main.css"].content);
});

test("Embed: GET /static-site/images/logo.png should return binary data", async () => {
  const res = await fetch(`${BaseURL}/static-site/images/logo.png`);

  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("image/png");

  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // @ts-ignore
  expect(bytes).toEqual(mockEmbeddedFiles["/images/logo.png"].content);
});

// --- Tests for Disk/Static Files ---

test("Static (Disk): GET /disk-src/Xerus.ts should return file content", async () => {
  // We mapped /disk-src to the ./src folder in the server file
  const res = await fetch(`${BaseURL}/disk-src/Xerus.ts`);
  const text = await res.text();

  expect(res.status).toBe(200);
  // Bun.file usually detects typescript as application/octet-stream or video/mp2t depending on config,
  // but let's just check the content matches the source code signature
  expect(text).toContain("export class Xerus");
});

test("Static (Disk): Traversal attempt should fail", async () => {
  // Attempt to go up directories to reach system files or other project files
  const res = await fetch(`${BaseURL}/disk-src/../package.json`);

  // Should trigger the Access Denied check in Xerus.static
  expect(res.status).toBe(404);
});

test("Static (Disk): Non-existent file should 404", async () => {
  const res = await fetch(`${BaseURL}/disk-src/does-not-exist.ts`);
  expect(res.status).toBe(404);
});
