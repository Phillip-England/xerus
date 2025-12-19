# Xerus 🐿️

**Xerus** is a high-performance, native web framework for **Bun**. It
features a Trie-based router, object pooling for zero-allocation
hotspots, and a type-safe, class-based validation system.

## Features

- 🚀 **Bun Native:** Optimized for Bun's `serve` and `file` APIs.
- 🧅 **Onion Middleware:** Koa-style `await next()` middleware execution
  with safeguard checks.
- ♻️ **Object Pooling:** Reuses `HTTPContext` instances to minimize GC
  overhead.
- 🛡️ **Type-Safe Validation:** Class-based request validation using Zod
  integration.
- ⚡ **Trie Router:** Fast lookups with strict precedence (Exact \>
  Param \> Wildcard).
- 📦 **Asset Embedding:** Macros to compile static files directly into
  your binary.
- 🔌 **WebSockets:** First-class support with lifecycle hooks and
  middleware.

------------------------------------------------------------------------

## Installation

``` bash
bun add xerus
```

------------------------------------------------------------------------

## 1. Quick Start

Create a simple HTTP server using `Xerus`. (Source:
`examples/0_hello.ts`)

``` ts
import { Xerus } from "xerus";
import { HTTPContext } from "xerus/HTTPContext";

const app = new Xerus();

app.get("/", (c: HTTPContext) => {
  return c.html("<h1>Hello from Xerus! 🐿️</h1>");
});

console.log("Listening on http://localhost:8080");
await app.listen(8080);
```

------------------------------------------------------------------------

## 2. Context & Response Methods

The `HTTPContext` provides helper methods for sending text, JSON, HTML,
or performing redirects. (Source: `examples/1_methods.ts`)

``` ts
import { Xerus } from "xerus";
import { HTTPContext } from "xerus/HTTPContext";

const app = new Xerus();

// Text Response
app.get("/text", (c: HTTPContext) => {
  return c.text("Just some plain text.");
});

// JSON Response
app.get("/json", (c: HTTPContext) => {
  return c.json({ framework: "Xerus", speed: "Fast" });
});

// HTML Response
app.get("/html", (c: HTTPContext) => {
  return c.html(`
    <div style="font-family: sans-serif;">
      <h1>Rich HTML</h1>
      <button>Click Me</button>
    </div>
  `);
});

// Redirect
app.get("/go-home", (c: HTTPContext) => {
  return c.redirect("/html");
});

await app.listen(8080);
```

------------------------------------------------------------------------

## 3. Routing Parameters & Queries

Xerus supports named parameters and query string parsing. (Source:
`examples/2_params_and_query.ts`)

``` ts
import { Xerus } from "xerus";
import { HTTPContext } from "xerus/HTTPContext";

const app = new Xerus();

// Dynamic Parameters: /user/123
app.get("/user/:id", (c: HTTPContext) => {
  const userId = c.getParam("id");
  return c.json({ userId });
});

// Multiple Parameters: /post/2023/12
app.get("/post/:year/:month", (c: HTTPContext) => {
  const { year, month } = c.params;
  return c.json({ year, month });
});

// Query Strings: /search?q=bun&limit=10
app.get("/search", (c: HTTPContext) => {
  const query = c.query("q");
  const limit = c.query("limit", "10"); // Default to 10
  
  return c.json({ 
    search_term: query, 
    results_limit: limit 
  });
});

await app.listen(8080);
```

------------------------------------------------------------------------

## 4. Routing Precedence

Xerus uses a deterministic routing priority: **Exact Match** \> **Param
Match** \> **Wildcard**. (Source: `examples/12_conflict_routes.ts`)

``` ts
import { Xerus } from "xerus";

const app = new Xerus();

// 1. PARAM MATCH
app.get("/files/:id", async (c) => {
  return c.json({ match: "Param ID", id: c.getParam("id") });
});

// 2. EXACT MATCH
// Even though :id could match "static", this should take precedence
app.get("/files/static", async (c) => {
  return c.json({ match: "Exact Static" });
});

// 3. WILDCARD MATCH
// This catches /files/static/old, /files/123/edit, etc.
app.get("/files/*", async (c) => {
  return c.json({ match: "Wildcard Catch-All", path: c.path });
});

await app.listen(8080);
```

------------------------------------------------------------------------

## 5. Body Parsing

Xerus handles JSON, Text, Forms, and Multipart data uniformly using the
`BodyType` enum. It also caches the raw body to allow multiple reads
(e.g., logging raw text then parsing JSON). (Source:
`examples/3_body_parsing.ts`)

``` ts
import { Xerus } from "xerus";
import { HTTPContext } from "xerus/HTTPContext";
import { BodyType } from "xerus/BodyType";

const app = new Xerus();

// Parse JSON Body
app.post("/api/json", async (c: HTTPContext) => {
  const data = await c.parseBody(BodyType.JSON);
  return c.json({ received: data });
});

// Demonstrating caching: Log raw text, then parse JSON
app.post("/api/log-then-parse", async (c: HTTPContext) => {
  const rawString = await c.parseBody(BodyType.TEXT);
  console.log("Raw Body:", rawString);

  const jsonData = await c.parseBody(BodyType.JSON);
  
  return c.json({ 
    was_logged: true, 
    data: jsonData 
  });
});

// Parse Form Data
app.post("/api/form", async (c: HTTPContext) => {
  const data = await c.parseBody(BodyType.FORM);
  return c.json({ received: data });
});

// Parse Multipart (File Uploads)
app.post("/api/upload", async (c: HTTPContext) => {
  const data = await c.parseBody(BodyType.MULTIPART_FORM) as FormData;
  const file = data.get("file"); 
  
  return c.json({ 
    fileName: file instanceof File ? file.name : "unknown",
    size: file instanceof File ? file.size : 0
  });
});

await app.listen(8080);
```

------------------------------------------------------------------------

## 6. Middleware

Xerus uses the "Onion" architecture. You can register global middleware
via `app.use()` or route-specific middleware. (Source:
`examples/4_middleware.ts`)

``` ts
import { Xerus } from "xerus";
import { HTTPContext } from "xerus/HTTPContext";
import { Middleware } from "xerus/Middleware";
import { logger } from "xerus/Middleware"; // Built-in logger

const app = new Xerus();

// Custom Middleware: Auth Check
const requireAuth = new Middleware(async (c: HTTPContext, next) => {
  const token = c.getHeader("Authorization");
  
  if (token !== "secret-token") {
    // Short-circuit request
    return c.setStatus(401).json({ error: "Unauthorized" });
  }
  
  console.log("Auth passed!");
  await next();
});

// 1. Global Middleware (Runs on every request)
app.use(logger);

// 2. Public Route (Only logger runs)
app.get("/", (c) => c.text("Public Area"));

// 3. Protected Route (Logger + requireAuth run)
app.get("/admin", async (c) => {
  return c.text("Welcome, Admin.");
}, requireAuth);

await app.listen(8080);
```

### Middleware Safeguards

Xerus detects "floating promises". If a middleware calls `next()`
without awaiting it, the request chain breaks. Xerus throws a System
Error if this happens. (Source: `examples/11_middlware_safeguard.ts`)

``` ts
const mwBroken = new Middleware(async (c: HTTPContext, next) => {
  // ❌ BAD: This fires off the rest of the chain asynchronously 
  // and immediately returns from this function.
  next(); 
});

const mwCorrect = new Middleware(async (c: HTTPContext, next) => {
  // ✅ GOOD: We pause here until the downstream handlers finish.
  await next();
});
```

------------------------------------------------------------------------

## 7. Route Grouping

Organize routes with common prefixes and middleware using `app.group()`.
(Source: `examples/5_groups.ts`)

``` ts
import { Xerus } from "xerus";
import { Middleware } from "xerus/Middleware";

const app = new Xerus();

const apiKeyMiddleware = new Middleware(async (c, next) => {
  c.setHeader("X-API-Version", "v1");
  await next();
});

// Create a group with a prefix and shared middleware
const api = app.group("/api/v1", apiKeyMiddleware);

// Final Path: /api/v1/users
api.get("/users", (c) => c.json([{ id: 1, name: "Alice" }]));

// Final Path: /api/v1/status
api.get("/status", (c) => c.json({ healthy: true }));

await app.listen(8080);
```

------------------------------------------------------------------------

## 8. Class-Based Validation

Xerus allows you to define request classes that encapsulate Zod schemas.
You retrieve validated data by passing the **Class Constructor** to
`c.getValid()`. (Source: `examples/10_validation.ts`)

``` ts
import { Xerus } from "xerus";
import { HTTPContext } from "xerus/HTTPContext";
import { Validator } from "xerus/Validator";
import { z } from "zod";

// 1. Define a Validation Class using Zod
class CreateUserRequest {
  static schema = z.object({
    username: z.string().min(3),
    email: z.string().email(),
    age: z.number().min(18)
  });

  public username: string;
  public email: string;
  public age: number;

  constructor(data: any) {
    this.username = data.username;
    this.email = data.email;
    this.age = data.age;
  }

  validate() {
    CreateUserRequest.schema.parse(this);
  }
}

const app = new Xerus();

// 2. Register Route with Validation Middleware
app.post(
  "/users",
  async (c: HTTPContext) => {
    // 3. Retrieve Validated Data by Class
    const user = c.getValid(CreateUserRequest);

    return c.json({
      message: "User created",
      user: { name: user.username, email: user.email }
    });
  },    
  Validator(CreateUserRequest)  
);

await app.listen(8080);
```

------------------------------------------------------------------------

## 9. Cookie Management

Helper methods for setting, getting, and clearing cookies with secure
defaults. (Source: `examples/6_cookies.ts`)

``` ts
import { Xerus } from "xerus";

const app = new Xerus();

app.get("/login", (c) => {
  c.setCookie("session_id", "xyz-123", {
    httpOnly: true,
    maxAge: 3600, // 1 hour
    sameSite: "Lax"
  });
  return c.text("Cookie Set!");
});

app.get("/dashboard", (c) => {
  const session = c.getCookie("session_id");
  return c.text(`Logged in with session: ${session}`);
});

await app.listen(8080);
```

------------------------------------------------------------------------

## 10. Static Files & Embedding

Serve files from disk (hot reload) or compile them into the binary using
Bun macros (single-file deployment). (Source:
`examples/7_static_files.ts`)

``` ts
import { Xerus } from "xerus";
import { resolve } from "path";
import { embedDir } from "xerus/macros" with { type: "macro" };

const app = new Xerus();

// 1. Disk Serving (Hot reloads)
app.static("/files", resolve(".")); 

// 2. Embedded Serving (Compiled into binary)
const srcFiles = embedDir(resolve("../src"));
app.embed("/source-code", srcFiles);

await app.listen(8080);
```

------------------------------------------------------------------------

## 11. WebSockets

Xerus wraps Bun's WebSocket implementation with middleware support and
named lifecycle handlers (open, message, close, drain). (Source:
`examples/8_websocket.ts`)

``` ts
import { Xerus } from "xerus";
import { logger } from "xerus/Middleware";

const app = new Xerus();

app.ws("/chat", {
  open: {
    handler: async (ws) => {
      ws.send("Welcome to Xerus Chat!");
    },
    middlewares: [logger] // Runs only on Open
  },
  message: async (ws, message) => {
    ws.send(`You said: ${message}`);
  }
});

await app.listen(8080);
```

------------------------------------------------------------------------

## 12. Error Handling

Define custom logic for 404 (Not Found) and 500 (Internal Error).
(Source: `examples/9_error_handling.ts`)

``` ts
import { Xerus } from "xerus";

const app = new Xerus();

// Custom 404 Handler
app.onNotFound(async (c) => {
  return c.setStatus(404).json({ error: "Resource Not Found", path: c.path });
});

// Global Error Handler
app.onErr(async (c) => {
  const err = c.getErr();
  console.error("Critical Failure:", err);
  return c.setStatus(500).json({ error: "Internal Server Error" });
});

await app.listen(8080);
```

------------------------------------------------------------------------

## Appendix: Source Directory Structure

Based on `Directory: src`, here is an overview of the core components:

- **Xerus.ts:** The main entry point. Manages the `TrieNode` router,
  global middlewares, and the server `listen` loop.
- **HTTPContext.ts:** Wraps Bun's `Request` and `Response`. Handles
  state (OPEN, WRITTEN, STREAMING), body parsing, and stores validation
  results.
- **HTTPHandler.ts & Middleware.ts:** Implements the Onion architecture.
  `HTTPHandler` compiles a chain of middlewares into a single executable
  function.
- **ObjectPool.ts:** Manages a pool of `HTTPContext` objects to reduce
  garbage collection pressure under high load.
- **Validator.ts & TypeValidator.ts:** Provides the `Validator`
  middleware which takes a class constructor, parses the body into it,
  and runs `validate()`.
- **WSHandler.ts:** Adapts the Xerus middleware chain for WebSocket
  events (open, message, close, drain).
- **macros.ts:** Contains the `embedDir` Bun macro for reading files at
  compile-time.
