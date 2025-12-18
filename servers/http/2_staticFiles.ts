import { Xerus } from "../../src/Xerus";

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
};

export function staticFileMethods(app: Xerus) {
  // CHANGED: Moved from "/" to "/static-site" to avoid collision with basicMethods
  app.static("/static-site", mockEmbeddedFiles);

  // Serve files from a specific assets prefix
  app.static("/assets", mockEmbeddedFiles);
}