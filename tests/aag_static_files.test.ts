import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { resolve } from "path";
import { Xerus } from "../src/Xerus";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

describe("Static files: embed + disk", () => {
  let server: any;
  let port: number;

  // Keep the test’s expected bytes/content in the same shape as assertions
  const expectedEmbedded = {
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

  beforeAll(async () => {
    const app = new Xerus();

    // app.embed expects a map; in your helper version logo.png was an array of numbers.
    // We'll build an embed map that preserves the same bytes but is compatible.
    const embedMap = {
      "/index.html": {
        content: expectedEmbedded["/index.html"].content,
        type: expectedEmbedded["/index.html"].type,
      },
      "/styles/main.css": {
        content: expectedEmbedded["/styles/main.css"].content,
        type: expectedEmbedded["/styles/main.css"].type,
      },
      "/images/logo.png": {
        // provide either Uint8Array or number[] depending on what embed supports;
        // Uint8Array is typically safe for binary.
        content: expectedEmbedded["/images/logo.png"].content,
        type: expectedEmbedded["/images/logo.png"].type,
      },
    };

    app.embed("/static-site", embedMap);

    const srcPath = resolve("./src");
    app.static("/disk-src", srcPath);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Embed: GET /static-site/index.html should return correct content", async () => {
    const res = await fetch(makeURL(port, "/static-site/index.html"));
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/html");
    expect(text).toContain("<h1>Home</h1>");
  });

  test("Embed: GET /static-site/ should fallback to index.html", async () => {
    const res = await fetch(makeURL(port, "/static-site/"));
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain("<h1>Home</h1>");
  });

  test("Embed: GET /static-site/styles/main.css should return CSS", async () => {
    const res = await fetch(makeURL(port, "/static-site/styles/main.css"));
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/css");
    expect(text).toBe(expectedEmbedded["/styles/main.css"].content);
  });

  test("Embed: GET /static-site/images/logo.png should return binary data", async () => {
    const res = await fetch(makeURL(port, "/static-site/images/logo.png"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    expect(bytes).toEqual(expectedEmbedded["/images/logo.png"].content);
  });

  test("Static (Disk): GET /disk-src/Xerus.ts should return file content", async () => {
    const res = await fetch(makeURL(port, "/disk-src/Xerus.ts"));
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain("export class Xerus");
  });

  test("Static (Disk): Traversal attempt should fail", async () => {
    const res = await fetch(makeURL(port, "/disk-src/../package.json"));
    expect(res.status).toBe(404);
  });

  test("Static (Disk): Non-existent file should 404", async () => {
    const res = await fetch(makeURL(port, "/disk-src/does-not-exist.ts"));
    expect(res.status).toBe(404);
  });
});
