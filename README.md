<div>

# Xerus Framework Documentation

Comprehensive guide and examples for the Xerus HTTP & WebSocket
framework.

</div>

<div role="main">

<div id="basics" class="section">

## 1. Basics

Fundamental concepts for setting up a server and defining routes.

### Hello World

<span class="filename">examples/0_hello.ts</span>

    import { Xerus } from "../src/Xerus";
    import { HTTPContext } from "../src/HTTPContext";

    const app = new Xerus();

    app.get("/", async (c: HTTPContext) => {
      return c.html("<h1>Hello from Xerus! 🐿️</h1>");
    });

    console.log("Listening on http://localhost:8080");
    await app.listen(8080);

### Response Methods

Helper methods for sending Text, JSON, HTML, and Redirects.

<span class="filename">examples/1_methods.ts</span>

    app.get("/text", async (c) => c.text("Just some plain text."));
    app.get("/json", async (c) => c.json({ framework: "Xerus", speed: "Fast" }));
    app.get("/html", async (c) => c.html("<h1>Rich HTML</h1>"));
    app.get("/go-home", async (c) => c.redirect("/html"));

### Parameters & Query Strings

Accessing dynamic route parameters (`:id`) and URL query strings.

<span class="filename">examples/2_params_and_query.ts</span>

    // Dynamic Parameters: /user/123
    app.get("/user/:id", async (c) => {
      const userId = c.getParam("id");
      return c.json({ userId });
    });

    // Query Strings: /search?q=bun&limit=10
    app.get("/search", async (c) => {
      const query = c.query("q");
      const limit = c.query("limit", "10"); // Default to 10
      return c.json({ search_term: query, results_limit: limit });
    });

</div>

<div id="request-handling" class="section">

## 2. Request Handling & Data

### Body Parsing

Parsing JSON, Text, Forms, and Multipart data using the `BodyType` enum.

<span class="filename">examples/3_body_parsing.ts</span>

    import { BodyType } from "../src/BodyType";

    // Parse JSON
    app.post("/api/json", async (c) => {
      const data = await c.parseBody(BodyType.JSON);
      return c.json({ received: data });
    });

    // Parse File Uploads
    app.post("/api/upload", async (c) => {
      const data = await c.parseBody(BodyType.MULTIPART_FORM) as FormData;
      const file = data.get("file"); 
      return c.json({ fileName: file instanceof File ? file.name : "unknown" });
    });

### Cookie Management

Setting, reading, and clearing HTTP cookies.

<span class="filename">examples/6_cookies.ts</span>

    app.get("/login", async (c) => {
      c.setCookie("session_id", "xyz-123", {
        httpOnly: true,
        maxAge: 3600,
        sameSite: "Lax"
      });
      return c.text("Cookie Set!");
    });

    app.get("/dashboard", async (c) => {
      const session = c.getCookie("session_id");
      return c.text(`Logged in with session: ${session}`);
    });

### File Downloads

Serving arbitrary files from disk within a handler.

<span class="filename">examples/15_file_download.ts</span>

    app.get("/download", async (c) => {
      await c.file("./README.md");
    });

### Context Storage (Request Scoped Data)

Sharing data between middleware and handlers using `setStore/getStore`.

<span class="filename">examples/16_request_scoped_data.ts</span>

    const attachUser = new Middleware(async (c, next) => {
      c.setStore("user", { id: 1, name: "Jace" });
      await next();
    });

    app.get("/me", async (c) => {
      const user = c.getStore("user");
      return c.json({ user });
    }, attachUser);

</div>

<div id="middleware" class="section">

## 3. Middleware & Architecture

### Custom Middleware

Defining middleware with the Onion pattern (await next).

<span class="filename">examples/4_middleware.ts</span>

    const requireAuth = new Middleware(async (c, next) => {
      const token = c.getHeader("Authorization");
      if (token !== "secret-token") {
        return c.setStatus(401).json({ error: "Unauthorized" });
      }
      await next();
    });

    app.use(logger); // Global
    app.get("/admin", async (c) => c.text("Admin"), requireAuth); // Local

### Route Grouping

Organizing routes under prefixes and applying shared middleware.

<span class="filename">examples/5_groups.ts</span>

    const api = app.group("/api/v1", apiKeyMiddleware);

    api.get("/users", async (c) => {
      return c.json([{ id: 1, name: "Alice" }]);
    });

### Middleware Safeguards

Xerus detects "floating promises" where middleware forgets to
`await next()`.

<span class="filename">examples/11_middlware_safeguard.ts</span>

    // This triggers a 500 Error
    const mwBroken = new Middleware(async (c, next) => {
      next(); // Missing await!
    });

### CORS

Built-in CORS middleware configuration.

<span class="filename">examples/13_cors.ts</span>

    import { cors } from "../src/Middleware";

    app.use(cors({
      origin: "https://example.com",
      methods: ["GET", "POST"],
      credentials: true
    }));

### Dependency Injection

Injecting services (like Databases) into the context via middleware.

<span class="filename">examples/25_dependency_injection.ts</span>

    const injectDB = new Middleware(async (c, next) => {
      c.setStore("db", new Database());
      await next();
    });

    app.use(injectDB);

### Object Pooling

Optimizing high-throughput scenarios by recycling context objects.

<span class="filename">examples/17_http_context_pool.ts</span>

    // Recycle up to 500 context objects to reduce GC pressure
    app.setHTTPContextPool(500);

</div>

<div id="validation" class="section">

## 4. Validation

Class-based, type-safe validation powered by Zod.

### Basic Body Validation

Validating JSON bodies and injecting the typed class instance.

<span class="filename">examples/10_validation.ts</span>

    class CreateUserRequest {
      static schema = z.object({ username: z.string().min(3) });
      public username: string;
      constructor(data: any) { this.username = data.username; }
      validate() { CreateUserRequest.schema.parse(this); }
    }

    app.post("/users", async (c) => {
      const user = c.getValid(CreateUserRequest); // Typed!
      return c.json({ name: user.username });
    }, Validator(CreateUserRequest));

### Multiple Validators

Chaining multiple validators on a single route.

<span class="filename">examples/19_multi_validator.ts</span>

    app.post("/create", async (c) => {
      const user = c.getValid(User);
      const meta = c.getValid(Meta);
      c.json({ user, meta });
    }, Validator(User), Validator(Meta));

### Flexible Sources

Validating Headers, Query Params, and Path Params using `Source`.

<span class="filename">examples/22_flexible_validation.ts</span>

    import { Source } from "../src/ValidationSource";

    app.get("/users/:id", async (c) => {
      const { id } = c.getValid(UserIdParam);
    }, Validator(UserIdParam, Source.PARAM("id")));

</div>

<div id="advanced-routing" class="section">

## 5. Advanced Routing & Content

### Static Files & Embedding

Serving from disk or embedding files into the binary with Bun Macros.

<span class="filename">examples/7_static_files.ts</span>

    import { embedDir } from "../src/macros" with { type: "macro" };

    // Disk
    app.static("/files", resolve("."));

    // Embedded Memory
    const assets = embedDir(resolve("../src"));
    app.embed("/assets", assets);

### Route Precedence

Understanding how Exact, Param, and Wildcard routes resolve.

<span class="filename">examples/12_conflict_routes.ts</span>

    // 1. Exact (/files/static) wins
    // 2. Param (/files/:id) is second
    // 3. Wildcard (/files/*) is last fallback

### Streaming

Streaming responses using `ReadableStream`.

<span class="filename">examples/14_streaming.ts</span>

    app.get("/stream", async (c) => {
      const stream = new ReadableStream({ ... });
      c.stream(stream);
    });

### Server-Sent Events (SSE)

Using streams to push events to the client.

<span class="filename">examples/24_server_sent_events.ts</span>

    app.get("/events", async (c) => {
      c.setHeader("Content-Type", "text/event-stream");
      // ... create stream ...
      c.stream(stream);
    });

### HTMX Integration

Checking headers to return HTML fragments.

<span class="filename">examples/26_htmx_fragments.ts</span>

    app.get("/search", async (c) => {
      if (c.getHeader("HX-Request")) {
        return c.html("<li>Fragment Only</li>");
      }
      return c.html("<html>Full Page</html>");
    });

</div>

<div id="websockets" class="section">

## 6. WebSockets

### Basic Handlers

Handling Open, Message, and Close events.

<span class="filename">examples/8_websocket.ts</span>

    app.open("/chat", async (ws) => ws.send("Welcome!"));
    app.message("/chat", async (ws, msg) => ws.send(`Echo: ${msg}`));

### Grouped WebSockets

Using Route Groups with WebSockets.

<span class="filename">examples/20_ws_grouped_chat.ts</span>

    const ws = app.group("/ws");
    ws.message("/chat", async (ws, msg) => { ... });

### WebSocket Validation

Validating incoming messages using `Source.WS_MESSAGE`.

<span class="filename">examples/23_ws_validation.ts</span>

    class ChatMessage { ... }

    ws.message("/channel", async (ws, raw) => {
      const msg = ws.data.getValid(ChatMessage); // Fully typed
      console.log(msg.text);
    }, Validator(ChatMessage, Source.WS_MESSAGE));

</div>

<div id="error-handling" class="section">

## 7. Error Handling

Handling 404s, global errors, and async error propagation.

<span class="filename">examples/9_error_handling.ts</span>

    // 404 Handler
    app.onNotFound(async (c) => {
      return c.setStatus(404).json({ error: "Not Found" });
    });

    // Global Error Handler
    app.onErr(async (c) => {
      const err = c.getErr();
      return c.setStatus(500).json({ error: err.message });
    });

<span class="filename">examples/18_async_error_propagation.ts</span>

Errors thrown in handlers automatically bubble up through middleware to
the global handler.

</div>

</div>
