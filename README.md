# Xerus
A minimal http framework for Bun!

## Installation
Install Xerus from github.

```bash
bun add github:phillip-england/xerus@latest
```

## Hello, World!
Get a server up and running!

```ts
import { type Context, Xerus } from "xerus/xerus";

const app = new Xerus();

app.get("/", async (c: Context) => {
  return c.html("<h1>GET /</h1>");
});

let server = Bun.serve({
  port: 8080,
  idleTimeout: 10,
  development: false,
  async fetch(req) {
    return await app.handleRequest(req);
  },
});

console.log(`starting server on port ${server.port}! 🚀`);
```
