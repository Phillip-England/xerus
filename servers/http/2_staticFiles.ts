import { Xerus } from "../../src/Xerus";
import { resolve } from "path";

// Mocking the output of the embedDir macro
const mockEmbeddedFiles = {
  "/index.html": {
    content: "<html><body><h1>Home</h1></body></html>",
    type: "text/html",
  },
  "/styles/main.css": {
    content: "body { background: #000; }",
    type: "text/css",
  },
  "/scripts/bundle.js": {
    content: "console.log('Xerus Static');",
    type: "application/javascript",
  },
  "/images/logo.png": {
    content: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    type: "image/png",
  },
};

export function staticFiles(app: Xerus) {
  // 1. EMBEDDED (Memory)
  // Replaced .static with .embed
  app.embed("/static-site", mockEmbeddedFiles);
  app.embed("/assets", mockEmbeddedFiles);

  // 2. DISK (Physical Files)
  // For testing purposes, we serve the 'src' directory of this project
  // This allows us to try and fetch 'Xerus.ts' in tests
  const srcPath = resolve("./src");
  app.static("/disk-src", srcPath);
}