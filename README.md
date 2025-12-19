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
  constructors.
- ⚡ **Trie Router:** Deterministic precedence (Exact \> Param \>
  Wildcard).
- 📦 **Embedded Assets:** Compile static files into a single binary via
  Bun macros.
- 🔌 **WebSockets:** Middleware-aware lifecycle hooks.

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

await app.listen(8080);
```

------------------------------------------------------------------------

## 2. Response Helpers

Text, JSON, HTML, and redirects. (Source: `examples/1_methods.ts`)

``` ts
app.get("/text", (c) => c.text("Just some plain text."));
app.get("/json", (c) => c.json({ framework: "Xerus" }));
app.get("/html", (c) => c.html("<h1>HTML</h1>"));
app.get("/go-home", (c) => c.redirect("/html"));
```

------------------------------------------------------------------------

## 3. Route Params & Queries

Named parameters and query helpers. (Source:
`examples/2_params_and_query.ts`)

``` ts
app.get("/user/:id", (c) => {
  return c.json({ id: c.getParam("id") });
});

app.get("/search", (c) => {
  return c.json({
    q: c.query("q"),
    limit: c.query("limit", "10"),
  });
});
```

------------------------------------------------------------------------

## 4. Body Parsing & Caching

Xerus caches request bodies so they can be safely read multiple times.
(Source: `examples/3_body_parsing.ts`)

``` ts
const raw = await c.parseBody(BodyType.TEXT);
const json = await c.parseBody(BodyType.JSON);
```

------------------------------------------------------------------------

## 5. Middleware

Onion-style middleware with explicit execution guarantees. (Source:
`examples/4_middleware.ts`)

``` ts
const auth = new Middleware(async (c, next) => {
  if (c.getHeader("Authorization") !== "secret") {
    return c.setStatus(401).json({ error: "Unauthorized" });
  }
  await next();
});
```

### Middleware Safeguards

Xerus detects floating promises. Calling `next()` without awaiting it
triggers a runtime error. (Source: `examples/11_middlware_safeguard.ts`)

``` ts
// ❌ Incorrect
next();

// ✅ Correct
await next();
```

------------------------------------------------------------------------

## 6. Route Groups

Shared prefixes and middleware. (Source: `examples/5_groups.ts`)

``` ts
const api = app.group("/api/v1", apiKeyMiddleware);
api.get("/users", (c) => c.json([]));
```

------------------------------------------------------------------------

## 7. Cookies

Secure cookie helpers. (Source: `examples/6_cookies.ts`)

``` ts
c.setCookie("session_id", "xyz", { httpOnly: true });
const session = c.getCookie("session_id");
c.clearCookie("session_id");
```

------------------------------------------------------------------------

## 8. Static Files & Embedding

Serve from disk or embed at compile time. (Source:
`examples/7_static_files.ts`)

``` ts
app.static("/files", resolve("."));
const embedded = embedDir(resolve("../src"));
app.embed("/source", embedded);
```

------------------------------------------------------------------------

## 9. WebSockets

Lifecycle hooks with middleware support. (Source:
`examples/8_websocket.ts`)

``` ts
app.ws("/chat", {
  open: async (ws) => ws.send("Welcome"),
  message: async (ws, msg) => ws.send(msg),
});
```

------------------------------------------------------------------------

## 10. Error Handling

Custom 404 and global error hooks. (Source:
`examples/9_error_handling.ts`)

``` ts
app.onNotFound((c) => c.setStatus(404).json({ error: "Not Found" }));
app.onErr((c) => c.setStatus(500).json({ error: "Internal Error" }));
```

------------------------------------------------------------------------

## 11. Validation (Multiple Classes)

Multiple validators may run on the same request. Data is retrieved by
constructor, not string keys. (Source: `examples/10_validation.ts`)

``` ts
const user = c.getValid(CreateUserRequest);
const meta = c.getValid(MetadataRequest);
```

------------------------------------------------------------------------

## 12. Routing Precedence

Deterministic routing: Exact \> Param \> Wildcard. (Source:
`examples/12_conflict_routes.ts`)

------------------------------------------------------------------------

## 13. CORS

Built-in CORS middleware. (Source: `examples/13_cors.ts`)

``` ts
app.use(cors());
app.get("/restricted", handler, cors({ origin: "https://example.com" }));
```

------------------------------------------------------------------------

## 14. Streaming Responses

Native `ReadableStream` support. (Source: `examples/14_streaming.ts`)

------------------------------------------------------------------------

## 15. File Downloads

Send files with proper headers. (Source: `examples/15_file_download.ts`)

------------------------------------------------------------------------

## 16. Request-Scoped Data

Per-request storage via `HTTPContext`. (Source:
`examples/16_request_scoped_data.ts`)

------------------------------------------------------------------------

## 17. HTTPContext Pooling

Configure pool size for high-load services. (Source:
`examples/17_http_context_pool.ts`)

------------------------------------------------------------------------

## 18. Async Error Propagation

Errors bubble correctly through middleware. (Source:
`examples/18_async_error_propagation.ts`)

------------------------------------------------------------------------

## 19. Multiple Validators

Multiple validation classes from one body. (Source:
`examples/19_multi_validator.ts`)

------------------------------------------------------------------------

## 20. Grouped WebSockets

WebSockets inside route groups. (Source:
`examples/20_ws_grouped_chat.ts`)

------------------------------------------------------------------------

## 21. Route Introspection

Demonstrates exact vs param vs wildcard resolution. (Source:
`examples/21_route_introspection.ts`)

------------------------------------------------------------------------

## Appendix: Example Directory

The `examples/` directory is the canonical documentation source. This
README is generated from `README.html` using:

``` bash
make readme
```
