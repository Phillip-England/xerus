# Xerus 🐿️

**Xerus** is a high-performance, native web framework for **Bun**. It is
designed around deterministic routing, zero-allocation hot paths, and
strict middleware correctness.

------------------------------------------------------------------------

## Features

- 🚀 **Bun Native:** Built directly on Bun’s `serve` and `file` APIs.
- 🧅 **Onion Middleware:** Koa-style `await next()` with runtime
  safeguard enforcement.
- ♻️ **Object Pooling:** Reuses `HTTPContext` instances to reduce GC
  pressure.
- 🛡️ **Class-Based Validation:** Zod-backed request validation using
  constructors and DI.
- ⚡ **Trie Router:** Deterministic precedence (Exact \> Param \>
  Wildcard).
- 📦 **Embedded Assets:** Compile static files into a single binary via
  Bun macros.
- 🔌 **Isolated WebSockets:** Individual handlers for open, message,
  close, and drain events.
- 🚨 **Granular Error Handling:** Define error handlers per-route or
  globally.

------------------------------------------------------------------------

## Installation

``` bash
bun add xerus
```

------------------------------------------------------------------------

## 1. Hello World

Minimal Xerus server. (Source: `examples/0_hello.ts`)

``` ts
import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

app.get("/", async (c: HTTPContext) => {
  return c.html("<h1>Hello from Xerus! 🐿️</h1>");
});

console.log("Listening on http://localhost:8080");
await app.listen(8080);
```

------------------------------------------------------------------------

## 2. Response Helpers

Text, JSON, HTML, and redirects. (Source: `examples/1_methods.ts`)

``` ts
app.get("/text", async (c) => c.text("Just some plain text."));
app.get("/json", async (c) => c.json({ framework: "Xerus", speed: "Fast" }));
app.get("/html", async (c) => c.html(`
  <div style="font-family: sans-serif;">
    <h1>Rich HTML</h1>
    <button>Click Me</button>
  </div>
`));
app.get("/go-home", async (c) => c.redirect("/html"));
```

------------------------------------------------------------------------

## 3. Route Params & Queries

Named parameters and query helpers. (Source:
`examples/2_params_and_query.ts`)

``` ts
// Dynamic Parameters
app.get("/user/:id", async (c) => {
  const userId = c.getParam("id");
  return c.json({ userId });
});

// Multiple Parameters
app.get("/post/:year/:month", async (c) => {
  const { year, month } = c.params;
  return c.json({ year, month });
});

// Query Strings
app.get("/search", async (c) => {
  return c.json({ 
    search_term: c.query("q"), 
    results_limit: c.query("limit", "10") 
  });
});
```

------------------------------------------------------------------------

## 4. Body Parsing & Caching

Xerus caches request bodies. You can read the body as text (for logging)
and then again as JSON without error. (Source:
`examples/3_body_parsing.ts`)

``` ts
app.post("/api/log-then-parse", async (c) => {
  // 1. Read as text (reuses cache if read previously)
  const rawString = await c.parseBody(BodyType.TEXT);
  console.log("Raw Body:", rawString);

  // 2. Read as JSON (reuses the cache and parses it)
  const jsonData = await c.parseBody(BodyType.JSON);
  
  return c.json({ was_logged: true, data: jsonData });
});
```

------------------------------------------------------------------------

## 5. Middleware

Onion-style middleware with explicit execution guarantees. (Source:
`examples/4_middleware.ts`)

``` ts
const requireAuth = new Middleware(async (c, next) => {
  if (c.getHeader("Authorization") !== "secret-token") {
    return c.setStatus(401).json({ error: "Unauthorized" });
  }
  console.log("Auth passed!");
  await next();
});

// Use globally or per-route
app.use(logger);
app.get("/admin", async (c) => c.text("Welcome, Admin."), requireAuth);
```

### Middleware Safeguards

Xerus detects floating promises. Calling `next()` without awaiting it
triggers a runtime error. (Source: `examples/11_middlware_safeguard.ts`)

``` ts
// ❌ Incorrect (Triggers 500 Logic Error)
next();

// ✅ Correct
await next();
```

------------------------------------------------------------------------

## 6. Route Groups

Shared prefixes and middleware. (Source: `examples/5_groups.ts`)

``` ts
const api = app.group("/api/v1", apiKeyMiddleware);

// Path: /api/v1/users
api.get("/users", async (c) => {
  return c.json([{ id: 1, name: "Alice" }]);
});
```

------------------------------------------------------------------------

## 7. Cookies

Secure cookie helpers. (Source: `examples/6_cookies.ts`)

``` ts
c.setCookie("session_id", "xyz-123", {
  httpOnly: true,
  maxAge: 3600,
  sameSite: "Lax"
});

const session = c.getCookie("session_id");
c.clearCookie("session_id");
```

------------------------------------------------------------------------

## 8. Static Files & Embedding

Serve from disk or embed at compile time. (Source:
`examples/7_static_files.ts`)

``` ts
import { embedDir } from "../src/macros" with { type: "macro" };

// 1. Disk Serving
app.static("/files", resolve(".")); 

// 2. Embedded Serving (Single Binary)
const srcFiles = embedDir(resolve("../src"));
app.embed("/source-code", srcFiles);
```

------------------------------------------------------------------------

## 9. WebSockets

Xerus uses isolated handlers for WebSocket events. Routes are merged
automatically, allowing you to define handlers separately. (Source:
`examples/8_websocket.ts`)

``` ts
// 1. Open Handler (with specific middleware)
app.open("/chat", async (ws) => {
  ws.send("Welcome!");
}, logger);

// 2. Message Handler
app.message("/chat", async (ws, message) => {
  ws.send(`You said: ${message}`);
  if (message === "close") ws.close();
});

// 3. Close Handler
app.close("/chat", async (ws, code, reason) => {
  console.log("Closed");
});
```

------------------------------------------------------------------------

## 10. Error Handling

Xerus supports both global error handlers and granular, per-route error
handlers. (Source: `examples/9_error_handling.ts`)

### Global Handlers

``` ts
app.onNotFound(async (c) => c.setStatus(404).json({ error: "Resource Not Found" }));

app.onErr(async (c, err) => {
  console.error("Global Failure:", err);
  return c.setStatus(500).json({ error: "Internal Server Error" });
});
```

### Granular (Per-Route) Handlers

Pass an error handler as the 3rd argument (before middlewares) to catch
errors for a specific route.

``` ts
app.get(
  "/risky",
  async (c) => { throw new Error("Boom!"); },
  // Local Error Handler
  async (c, err) => {
    c.setStatus(400).json({ handled_locally: true, error: err.message });
  }
);
```

------------------------------------------------------------------------

## 11. Class-Based Validation

Zod-backed validation classes. Data is injected directly into the
context type-safely. (Source: `examples/10_validation.ts`)

``` ts
class CreateUserRequest {
  static schema = z.object({
    username: z.string().min(3),
    email: z.string().email()
  });
  
  constructor(data: any) {
    this.username = data.username;
    this.email = data.email;
  }

  validate() { CreateUserRequest.schema.parse(this); }
}

app.post("/users", async (c) => {
  // Retrieve validated instance
  const user = c.getValid(CreateUserRequest);
  return c.json({ name: user.username });
}, Validator(CreateUserRequest));
```

### Flexible Validation Sources

Validate Headers, Query Params, and Route Params. (Source:
`examples/22_flexible_validation.ts`)

``` ts
app.get(
  "/users/:id",
  handler,
  Validator(UserIdParam, Source.PARAM("id")),
  Validator(SortQuery, Source.QUERY("sort")),
  Validator(ApiKeyHeader, Source.HEADER("x-api-key"))
);
```

------------------------------------------------------------------------

## 12. Routing Precedence

Deterministic routing: Exact \> Param \> Wildcard. (Source:
`examples/12_conflict_routes.ts`)

``` ts
// 1. Exact
app.get("/files/static", ...); 

// 2. Param (matches /files/123)
app.get("/files/:id", ...);

// 3. Wildcard (matches /files/a/b)
app.get("/files/*", ...);
```

------------------------------------------------------------------------

## 13. CORS

Built-in CORS middleware. (Source: `examples/13_cors.ts`)

``` ts
// Global
app.use(cors());

// Per-Route
app.get("/restricted", handler, cors({ 
  origin: "https://example.com",
  credentials: true 
}));
```

------------------------------------------------------------------------

## 14. Streaming Responses

Native `ReadableStream` support. (Source: `examples/14_streaming.ts`)

``` ts
app.get("/stream", async (c) => {
  const stream = new ReadableStream({ ... });
  c.stream(stream);
});
```

------------------------------------------------------------------------

## 15. File Downloads

Send files with automatic MIME detection. (Source:
`examples/15_file_download.ts`)

``` ts
app.get("/download", async (c) => {
  await c.file("./README.md");
});
```

------------------------------------------------------------------------

## 16. Request-Scoped Data

Demonstrates passing data through the request lifecycle. (Source:
`examples/16_request_scoped_data.ts`)

------------------------------------------------------------------------

## 17. HTTPContext Pooling

Configure pool size for high-load services to reduce garbage collection.
(Source: `examples/17_http_context_pool.ts`)

``` ts
app.setHTTPContextPool(500);
```

------------------------------------------------------------------------

## 18. Async Error Propagation

Errors bubble correctly through async middleware chains. (Source:
`examples/18_async_error_propagation.ts`)

------------------------------------------------------------------------

## 19. Multiple Validators

Apply multiple validation classes to a single route. (Source:
`examples/19_multi_validator.ts`)

``` ts
app.post("/create", async (c) => {
    const user = c.getValid(User);
    const meta = c.getValid(Meta);
    c.json({ user, meta });
  },
  Validator(User),
  Validator(Meta)
);
```

------------------------------------------------------------------------

## 20. Grouped WebSockets

Defining WebSocket routes inside prefix groups. (Source:
`examples/20_ws_grouped_chat.ts`)

``` ts
const ws = app.group("/ws", logger);

ws.open("/chat", async (ws) => { ... });
ws.message("/chat", async (ws, msg) => { ... });
```

------------------------------------------------------------------------

## 21. Route Introspection

Demonstrates how the router resolves conflicting paths. (Source:
`examples/21_route_introspection.ts`)

------------------------------------------------------------------------

## Appendix: Example Directory

The `examples/` directory is the canonical documentation source. This
README is generated from `README.html` using:

``` bash
make readme
```
