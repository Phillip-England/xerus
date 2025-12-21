import { Xerus } from "../../src/Xerus";
import { resolve } from "path";

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
    content: [137, 80, 78, 71, 13, 10, 26, 10], 
    type: "image/png",
  },
};

export function staticFiles(app: Xerus) {
  app.embed("/static-site", mockEmbeddedFiles);
  app.embed("/assets", mockEmbeddedFiles);
  const srcPath = resolve("./src");
  app.static("/disk-src", srcPath);
}