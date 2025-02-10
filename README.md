# Xerus

A minimal http framework for Bun!

## Installation

```bash
bun add github:phillip-england/xerus
```

## Hello, World

```ts
import { type Context, cors, logger, staticHandler, Xerus } from "./src/xerus";

const app = new Xerus();

// handling static files
app.get("/static/*", staticHandler("./static"), logger);

app.get("/", async (c: Context) => {
  return c.html("<h1>GET /</h1>");
}, logger); // chain middleware here

app.post(
  "/",
  async (c: Context) => {
    return c.json({ "user": "phillip" }, 200);
  },
  logger,
  cors(),
); // use default cors configuration

let server = Bun.serve({
  port: 8080,
  idleTimeout: 10,
  async fetch(req) {
    let response = await app.handleRequest(req);
    if (response) {
      return response;
    }
    return new Response("404 Not Found", { status: 404 }); // custom 404 logic here
  },
});

console.log(`starting server on port ${server.port}`);
```
