Features
--------

*   🚀 **Bun Native:** Optimized for Bun's `serve` and `file` APIs.
*   🧅 **Onion Middleware:** Koa-style `await next()` middleware execution.
*   ♻️ **Object Pooling:** Reuses `HTTPContext` instances to minimize garbage collection overhead.
*   🛡️ **Type-Safe Validation:** Class-based request validation using Zod integration.
*   ⚡ **Trie Router:** fast lookups for static, parameter, and wildcard routes.
*   📦 **Asset Embedding:** Macros to compile static files directly into your binary.
*   🔌 **WebSockets:** First-class support with middleware integration for WS events.

* * *

Installation
------------

    bun add xerus

* * *

Quick Start
-----------

Create a simple HTTP server in `index.ts`:

```ts
import { Xerus } from "xerus";
import { HTTPContext } from "xerus/HTTPContext";

const app = new Xerus();

app.get("/", (c: HTTPContext) => {
  return c.json({ message: "Hello from Xerus! 🐿️" });
});

await app.listen(8080);
```

* * *

Routing
-------

Xerus uses a Trie-based router supporting exact paths, parameters, and wildcards.

```ts
// Exact match
app.get("/users/me", (c) => c.text("Current User"));

// Parameters
app.get("/users/:id", (c) => {
  const id = c.getParam("id");
  return c.json({ id });
});

// Wildcards
app.get("/files/*", (c) => {
  return c.text(`Requested path: ${c.path}`);
});

// Route Groups
const api = app.group("/api/v1");
api.get("/status", (c) => c.json({ status: "ok" }));
```

* * *

Context & Response
------------------

The `HTTPContext` object is pooled. It provides helpers for responses and parsing.

### Sending Responses

```ts
app.get("/demo", (c) => {
  // Chainable methods
  c.setStatus(201)
    .setHeader("X-Powered-By", "Xerus")
    .json({ success: true });
    
  // Or HTML
  // c.html("<h1>Hello</h1>");
  
  // Or Redirect
  // c.redirect("/login");
});
```

### Body Parsing

Xerus handles JSON, Text, Forms, and Multipart data uniformly.

```ts
import { BodyType } from "xerus/BodyType";

app.post("/upload", async (c) => {
  // Types: JSON, TEXT, FORM, MULTIPART_FORM
  const body = await c.parseBody(BodyType.JSON);
  return c.json({ received: body });
});
```
* * *

Middleware
----------

Xerus uses the "Onion" architecture. You **must** await `next()` to continue the chain.

```ts
import { Middleware } from "xerus/Middleware";

const logger = new Middleware(async (c, next) => {
  const start = performance.now();
  
  // 1. Logic before handler
  console.log(`-> ${c.method} ${c.path}`);

  // 2. Execute downstream middleware/handler
  await next(); 

  // 3. Logic after handler (Response is generated but not sent yet)
  const duration = performance.now() - start;
  console.log(`<- Done in ${duration.toFixed(2)}ms`);
});

app.use(logger);
```

* * *

Class-Based Validation
----------------------

Xerus integrates Zod validation directly into the request lifecycle using the `Validator` middleware.

```ts
import { z } from "zod";
import { Validator } from "xerus/Validator";

// 1. Define the Request Class
class CreateUser {
  username: string;
  email: string;

  constructor(data: any) {
    this.username = data.username;
    this.email = data.email;
  }

  async validate() {
    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
    });
    await schema.parseAsync(this);
  }
}

// 2. Use it in a route
app.post("/signup", async (c) => {
  // Type-safe retrieval!
  const body = c.getValid(CreateUser); 
  return c.json({ welcome: body.username });
}, Validator(CreateUser));
```

* * *

WebSockets
----------

Xerus provides a clean API for WebSockets, supporting lifecycle hooks and middleware.

```ts
app.ws("/chat", {
  open: async (ws) => {
    ws.send("Welcome!");
  },
  message: async (ws, msg) => {
    ws.send(`Echo: ${msg}`);
  },
  close: async (ws) => {
    console.log("Client disconnected");
  }
});
```

* * *

Static Files & Embedding
------------------------

You can serve files from disk or embed them into the binary using Bun macros.

```ts
import { resolve } from "path";
import { embedDir } from "xerus/macros" with { type: "macro" };

// 1. Serve from Disk (Hot reloads)
app.static("/public", resolve("./public"));

// 2. Embed into Binary (Single file deployment)
const assets = embedDir(resolve("./assets"));
app.embed("/assets", assets);
```

* * *

Performance Tuning
------------------

### Object Pooling

Xerus reuses `HTTPContext` objects to avoid creating thousands of short-lived objects under high load. You can configure the pool size based on your concurrency needs.

```ts
app.setHTTPContextPool(1000);
```