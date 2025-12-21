# Xerus 🐿️ — Bun-Native Web + WebSocket Framework

Xerus is a high-performance, Bun-native HTTP + WebSocket framework built around:

- **Trie-based router** (fast path matching, params, wildcard)
- **Onion middleware** (`await next()`) with runtime safeguard checks
- **Zero/low allocation hotspots** via **`HTTPContext` object pooling**
- **Unified validation pipeline** with **request-scoped `ValidatedData`**
- **Ergonomic response helpers** + **consistent JSON error envelope**
- **WebSocket lifecycle routing** with a first-class **`WSContext`**

This README documents the framework as implemented in the `src/` directory you provided.

---

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Core concepts](#core-concepts)
  - [`Xerus`](#xerus)
  - [`Route`](#route)
  - [`WSRoute`](#wsroute)
  - [Contexts: `HTTPContext` + `WSContext`](#contexts-httpcontext--wscontext)
  - [Response model: `MutResponse`](#response-model-mutresponse)
  - [Middleware](#middleware)
  - [Validation](#validation)
  - [Error handling](#error-handling)
  - [Static & embedded assets](#static--embedded-assets)
  - [Object pooling](#object-pooling)
  - [Router behavior](#router-behavior)
- [Recipes](#recipes)
  - [Query + param validation](#query--param-validation)
  - [Body validation](#body-validation)
  - [Timeouts](#timeouts)
  - [CORS](#cors)
  - [Rate limiting](#rate-limiting)
  - [CSRF protection](#csrf-protection)
  - [Response compression](#response-compression)
  - [WebSocket chat example](#websocket-chat-example)
- [API reference](#api-reference)
- [Design notes & gotchas](#design-notes--gotchas)

---

## Installation

Xerus is written for **Bun** and uses Bun APIs (`Bun.serve`, `Bun.file`, `ServerWebSocket`, etc.).

In your Bun project:
```
bun add github:phillip-england/xerus#v0.0.56
```

---

## Quick start

### HTTP

```ts
import { Xerus } from "./src/Xerus";
import { Route } from "./src/Route";
import { logger, cors } from "./src/Middleware";
import { Source } from "./src/ValidationSource";
import * as v from "./src/ValidationUtils";

const app = new Xerus();

// Global middleware runs before per-route middleware.
app.use(logger, cors());

app.mount(
  new Route("GET", "/", async (c) => {
    c.json({ message: "Hello, world!" });
  }),

  new Route("POST", "/items", async (c, data) => {
    const body = data.get("body"); // validated JSON
    c.setStatus(201).json({ message: "Item created", data: body });
  }).validate(
    Source.JSON(),
    "body",
    v.required(),
    v.asObject(),
    v.shape({
      name: v.required(),
    }),
  ),
);

await app.listen(8080);
```

### WebSockets

```ts
import { Xerus } from "./src/Xerus";
import { WSRoute, WSMethod } from "./src/WSRoute";
import { logger } from "./src/Middleware";
import { Source } from "./src/ValidationSource";
import * as v from "./src/ValidationUtils";

const app = new Xerus();

app.mount(
  new WSRoute(WSMethod.OPEN, "/ws/chat", async (c) => {
    c.ws.send("👋 Welcome!");
  }).use(logger),

  new WSRoute(WSMethod.MESSAGE, "/ws/chat", async (c, data) => {
    const msg = data.get("msg");
    c.ws.send(`echo: ${msg}`);
  })
    .use(logger)
    .validate(Source.WS_MESSAGE(), "msg", v.required(), v.asString(), v.maxLength(1000)),

  new WSRoute(WSMethod.CLOSE, "/ws/chat", async (_c) => {
    // close handler
  }).use(logger),
);

await app.listen(8080);
```

---

## Core concepts

### `Xerus`

**File:** `src/Xerus.ts`

`Xerus` is the application/server object.

Key responsibilities:

- Stores routes in a **Trie router**
- Compiles HTTP middleware chains into `HTTPHandler`
- Compiles WS lifecycle chains into `WSHandler`
- Manages a pooled `HTTPContext` via `ObjectPool`
- Hosts server-level error handling and not-found handling
- Serves HTTP and upgrades WebSocket connections via Bun’s `Bun.serve`

#### Constructor

```ts
const app = new Xerus();
```

Internally, it creates a pooled context pool of size `200` by default.

#### Global middleware

```ts
app.use(...middlewares);
```

These apply to **all HTTP routes** (and also to WS event pipelines, because WS handlers reuse the underlying `HTTPContext` middleware execution).

#### Mount routes

```ts
app.mount(...routes);
```

- For `Route` (HTTP): merges `globalMiddlewares` + route middlewares, compiles the chain, and registers.
- For `WSRoute` (WS): compiles into a `WSHandler` and registers under method `"WS"` for the given path.
  - Multiple `WSRoute` entries can share a path; Xerus merges their compiled lifecycle callbacks.

#### Not found handler

```ts
app.onNotFound(async (c) => {
  c.notFound("Route does not exist");
});
```

Optional per-not-found middleware can be passed too.

#### Global error handler

```ts
app.onErr(async (c, err) => {
  c.internalError(err?.message ?? "Unknown");
});
```

This is used for **non-`SystemErr`** exceptions. `SystemErr` is handled by `SystemErrRecord` by default.

#### Static / embedded files

See [Static & embedded assets](#static--embedded-assets).

#### Start server

```ts
await app.listen(8080);
```

Creates a Bun server and logs `🚀 Server running on <port>`.

---

### `Route`

**File:** `src/Route.ts`

A `Route` is a single HTTP endpoint:

- HTTP verb (`GET`, `POST`, etc.)
- path (`/items/:id`, `/assets/*`, etc.)
- handler `HTTPHandlerFunc`

```ts
new Route("GET", "/items/:id", async (c, data) => {
  const id = data.get("id"); // if validated
  c.json({ id });
});
```

#### Per-route middleware

```ts
route.use(mw1, mw2);
```

Middlewares execute in onion order.

#### Per-route error handler

```ts
route.onErr(async (c, err) => {
  c.setErr(err);
  c.internalError("Route failed", "INTERNAL_ERROR", { detail: err?.message });
});
```

If present, it will be used by `HTTPHandler.execute` when the handler/middleware chain throws.

#### Validation via `route.validate(...)`

This is a key feature: validation middleware is injected **automatically** (prepended) without you manually adding it as middleware.

```ts
import { Source } from "./ValidationSource";
import * as v from "./ValidationUtils";

route.validate(
  Source.QUERY("page"),
  "page",
  v.defaultTo("1"),
  v.asInt(),
  v.min(1),
);
```

Validated values land in **request-scoped** `ValidatedData` and are passed into the handler as `data`.

---

### `WSRoute`

**File:** `src/WSRoute.ts`

A `WSRoute` maps a **WebSocket lifecycle event** to a path:

- `WSMethod.OPEN`
- `WSMethod.MESSAGE`
- `WSMethod.CLOSE`
- `WSMethod.DRAIN`

```ts
new WSRoute(WSMethod.MESSAGE, "/ws/chat", async (c, data) => {
  const msg = data.get("msg");
  c.ws.send(msg);
});
```

#### WS middleware

```ts
wsRoute.use(logger);
```

WS middleware uses the **underlying `HTTPContext`** (it runs via `Middleware<HTTPContext>`), which is why `logger` works for both.

#### WS per-route error handler

```ts
wsRoute.onErr(async (http, err) => {
  // Note: WS onErr receives HTTPContext + error (not WSContext)
  console.error("WS error", err);
});
```

#### WS validation via `wsRoute.validate(...)`

WS validation runs **inside `WSHandler`** with a real `WSContext`.

```ts
wsRoute.validate(
  Source.WS_MESSAGE(),
  "msg",
  v.required(),
  v.asString(),
  v.maxLength(1000),
);
```

Validation sources for WS include:

- HTTP-ish sources from the upgrade request: `QUERY`, `PARAM`, `HEADER`
- WS-only: `WS_MESSAGE`, `WS_CLOSE`

> Body sources (`JSON`, `FORM`, etc.) are not supported for WS validation and will throw.

---

### Contexts: `HTTPContext` + `WSContext`

#### `HTTPContext`

**File:** `src/HTTPContext.ts`

`HTTPContext` is the per-request object (pooled and reused). It wraps:

- incoming `Request` as `c.req`
- mutable outgoing response as `c.res` (`MutResponse`)
- parsed URL/segments/params
- request-scoped stores:
  - `c.data` (arbitrary middleware storage)
  - `c.validated` (`ValidatedData`) for validated values

A handler has signature:

```ts
type HTTPHandlerFunc = (c: HTTPContext, data: ValidatedData) => Promise<void>;
```

So you can:

- use `c` to read request + write response
- use `data` to read validated values

##### Key request properties

- `c.path`: normalized path (trailing slashes removed)
- `c.method`: request method
- `c.params`: route params
- `c.url`: lazily-parsed `URL`
- `c.segments`: lazily-split path segments

##### Request helpers

- `c.getParam(name, default?)`
- `c.query(key, default?)`
- `c.queries` (object of all query params)
- `c.getHeader(name)`
- `c.getClientIP()` (best effort via XFF / X-Real-IP)
- `c.getRequestId()` (reads `c.data.requestId` if middleware sets it)

##### Response writing

- `c.setStatus(code)`
- `c.setHeader(name, value)` (rejects newlines)
- `c.getResHeader(name)` (reads from outgoing response)
- `c.text(string)`
- `c.html(string)`
- `c.json(any)`
- `c.stream(ReadableStream)`
- `await c.file(path)` (serves file via `Bun.file`)

##### Response lifecycle: `ContextState`

`HTTPContext` protects response mutation using `ContextState`:

- `OPEN`: normal
- `WRITTEN`: body finalized (handler chain should stop writing body)
- `STREAMING`: streaming started; headers immutable
- `SENT`: response handed off (reserved/immutable)

Calling `c.finalize()` moves `OPEN -> WRITTEN`.

Body writers like `text/json/html/file` automatically finalize.

##### Redirect

```ts
c.redirect("/login");                  // 302
c.redirect("/login", 301);             // custom
c.redirect("/search", { q: "hi" }, 302);
```

Redirect validates against newline characters in the final location.

##### Unified JSON error envelope

Xerus standardizes errors as:

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human summary",
    "detail": "Optional detail",
    "...": "Optional extras"
  }
}
```

Core method:

```ts
c.errorJSON(status, code, message, extra?);
```

Ergonomic helpers call `errorJSON`:

- `c.badRequest(...)`
- `c.unauthorized(...)`
- `c.forbidden(...)`
- `c.notFound(...)`
- `c.conflict(...)`
- `c.tooManyRequests(...)`
- `c.internalError(...)`
- `c.serviceUnavailable(...)`
- `c.gatewayTimeout(...)`

##### Cookie helpers

- `c.getCookie(name)`
- `c.setCookie(name, value, options?: CookieOptions)`
- `c.clearCookie(name, path?, domain?)`

`CookieOptions` supports:

- `path`, `domain`, `maxAge`, `expires`, `httpOnly`, `secure`, `sameSite`

> **Important:** `MutResponse` supports multiple `Set-Cookie` headers safely.

##### Body parsing (`parseBody`) + consumption rules

Use:

```ts
await c.parseBody(BodyType.JSON); // BodyType.JSON | TEXT | FORM | MULTIPART_FORM
```

Rules enforced:

- JSON and FORM are mutually exclusive once parsed (no re-parsing JSON->FORM or FORM->JSON)
- MULTIPART consumes body and blocks re-parsing into other types
- TEXT can be served from cached raw body if already read

This avoids subtle Bun/Fetch body-stream footguns.

##### Timeout behavior

`HTTPContext` checks `c.data.__timeoutSent` (set by timeout middleware).  
After timeout, **writes become NO-OP** instead of throwing.

---

#### `WSContext`

**File:** `src/WSContext.ts`

`WSContext` wraps everything you want during WebSocket events:

- `c.ws` → `ServerWebSocket<HTTPContext>` (the underlying Bun WebSocket)
- `c.http` → the underlying `HTTPContext` from the upgrade request
- `c.data` → `ValidatedData` (same instance as `c.http.validated`)
- `c.message` → string/buffer for MESSAGE events, or `""`
- `c.code` / `c.reason` → for CLOSE events, or `0` / `""`

This avoids having to use `ws.data` directly in handlers.

---

### Response model: `MutResponse`

**File:** `src/MutResponse.ts`

`MutResponse` is a mutable response builder that eventually produces a standard `Response`:

- `statusCode`
- `headers: Record<string,string>`
- `cookies: string[]` (separate store for multiple Set-Cookie)
- `bodyContent: BodyInit | null`

Key methods:

- `reset()`
- `setStatus(code)`
- `setHeader(name, value)`
  - if name is `Set-Cookie`, it appends to `cookies` list
- `appendCookie(value)` (recommended cookie API)
- `getHeader(name)` (returns last `Set-Cookie` if queried)
- `getBody()` (safe body inspection for middleware)
- `body(content)`
- `send()` → returns a `Response` merging headers + cookies properly

---

### Middleware

**Files:** `src/Middleware.ts`, `src/MiddlewareFn.ts`, `src/MiddlewareNextFn.ts`

Middleware is onion-style:

```ts
export type MiddlewareFn<C> = (c: C, next: () => Promise<void>) => Promise<void>;
```

You must `await next()`.

#### Safeguard: "called next() but did not await it"

Xerus compiles middleware chains and detects when `next()` was called but not awaited.
If it happens, it throws `SystemErrCode.MIDDLEWARE_ERROR`.

This catches subtle bugs that break onion semantics.

#### Provided middleware

**logger**

Logs `[METHOD][path][ms]`.

**cors(options)**

Sets:

- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`
- optionally `Access-Control-Allow-Credentials`

Handles OPTIONS preflight by returning `204`.

**requestId(opts)**

Sets/echoes a request ID in a header (default `X-Request-Id`) and stores it in `c.data.requestId`.

**rateLimit(opts)**

In-memory fixed-window limiter:

- Adds `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- On exceed: `Retry-After` + 429 response with `{ retryAfterSec }`

Key defaults:

- key: `c.getClientIP()` (best effort)
- message: "Rate limit exceeded"

**csrf(opts)**

Double-submit cookie strategy:

- Sets a token cookie on safe methods (configurable)
- For unsafe methods, requires header token matching cookie token
- On failure: 403 with code `CSRF_FAILED`

**timeout(ms, opts?)**

Soft-timeout middleware:

- Races downstream work against a timer
- If timeout wins:
  - marks `c.data.__timeoutSent = true`
  - sends a 504 JSON error response (if nothing written yet)
  - sets `c.data.__holdRelease` so the pooled context is not released until downstream finishes (prevents reuse race)

**compress(opts?)**

If client supports `br` or `gzip` (via `Accept-Encoding`) and body size ≥ threshold:

- Compresses string/bytes responses using `CompressionStream` if available
- Sets `Content-Encoding` and `Vary: Accept-Encoding`

---

### Validation

**Files:** `src/Validator.ts`, `src/ValidatedData.ts`, `src/ValidationSource.ts`, `src/ValidationUtils.ts`

Validation is implemented as **middleware** that runs before your handler and stores results in `ValidatedData`.

#### `ValidatedData`

A request-scoped storage:

```ts
data.set("page", 3);
data.get("page");        // throws if missing
data.maybe("page");      // returns undefined if missing
```

It also supports class keys (`data.get(SomeClass)`) for back-compat, but the preferred mode is **string keys**.

> `HTTPContext.validated` is cleared on each request reset, and WS validations clear per event.

#### Sources (`Source`)

`ValidationSource.ts` defines `SourceType` and a factory class `Source`:

HTTP sources:

- `Source.JSON()`
- `Source.FORM()`
- `Source.MULTIPART()`
- `Source.TEXT()`
- `Source.QUERY(key?)` (if omitted, returns all query params object)
- `Source.PARAM(key)`
- `Source.HEADER(key)`

WS-only sources:

- `Source.WS_MESSAGE()`
- `Source.WS_CLOSE()`

#### HTTP validation middleware (`HTTPValidator`)

`HTTPValidator(source, outKey, ...fns)`:

- Extracts raw data from `HTTPContext` based on `source`
- Pipes it through the validator functions
- Stores result at `c.validated.set(outKey, validated)`
- Throws `SystemErrCode.VALIDATION_FAILED` on validation errors

You normally don’t call `HTTPValidator` directly—use `route.validate(...)`.

#### Validator functions and utilities

`ValidationUtils.ts` provides composable validators and transforms.

Common ones:

- Presence: `required()`, `optional(...)`, `defaultTo(x)`
- Strings: `asString()`, `trim()`, `toLower()`, `toUpper()`, `nonEmpty()`, `minLength(n)`, `maxLength(n)`, `matches(re)`, `isEmail()`, `isUUID()`
- Numbers: `asNumber()`, `asInt()`, `min(n)`, `max(n)`
- Booleans: `asBoolean()`
- Enums: `oneOf([...])`
- Arrays: `asArrayOf(itemValidator, {min,max})`
- Objects: `asObject()`, `parseJSON()`, `pick(key)`, `shape({...})`
- Dates: `asDate()`, `asISODate()`, `minDate()`, `maxDate()`

These throw `ValidationError` with readable messages; the framework wraps them into `SystemErrCode.VALIDATION_FAILED`.

---

### Error handling

**Files:** `src/SystemErr.ts`, `src/SystemErrCode.ts`, `src/SystemErrRecord.ts`

Xerus uses two tiers:

1. **System errors** (`SystemErr`) with a `SystemErrCode` enum:
   - `FILE_NOT_FOUND`
   - `BODY_PARSING_FAILED`
   - `VALIDATION_FAILED`
   - `ROUTE_ALREADY_REGISTERED`
   - `ROUTE_NOT_FOUND`
   - `INTERNAL_SERVER_ERROR`
   - `WEBSOCKET_UPGRADE_FAILURE`
   - `HEADERS_ALREADY_SENT`
   - `MIDDLEWARE_ERROR`

2. **User-land errors** (anything else)

When `handleHTTP()` catches an error:

- If it is a `SystemErr`, it uses `SystemErrRecord[code]` to emit a standard error response.
- Otherwise:
  - if `app.onErr(...)` was set, it runs that handler
  - else, it returns a 500 JSON error with a warning

`SystemErrRecord` always uses the canonical JSON envelope via `c.errorJSON(...)`.

> `HEADERS_ALREADY_SENT` cannot safely write a response, so it logs.

---

### Static & embedded assets

#### `app.static(prefix, rootDir)`

Serves real files from disk.

- Uses `resolve()` and ensures path stays inside `rootDir` (prevents path traversal).
- Internally does `await c.file(finalPath)`.

Example:

```ts
app.static("/public", "./public");
```

Request `/public/app.js` maps to `./public/app.js`.

#### `app.embed(prefix, embeddedFiles)`

Serves assets from an in-memory dictionary.

This is intended to work with Bun macros like `embedDir()` to bundle files at compile-time.

Example:

```ts
import { embedDir } from "./src/macros";

const files = embedDir("/abs/path/to/public");
app.embed("/public", files);
```

---

### Object pooling

**File:** `src/ObjectPool.ts`

`Xerus` uses an `ObjectPool<HTTPContext>` to reuse context instances:

- `acquire()` pops from pool or creates new on burst
- `release()` returns to pool up to a max limit
- `resize(newSize)` adjusts pool limit and can prefill

Configure via:

```ts
app.setHTTPContextPool(500);
```

Special note for WebSockets:

- WebSocket upgrades also use pooled `HTTPContext`
- That context is held for the duration of the WS connection
- It’s released back to the pool in the WS `close` handler
- Timeout middleware uses `__holdRelease` to prevent releasing early

---

### Router behavior

**File:** `src/TrieNode.ts` + `src/Xerus.ts`

Routing supports:

- Exact segments: `/users/me`
- Params: `/users/:id` (stored in `c.params`)
- Wildcards: `/assets/*`

Matching priority:

1. exact segment
2. param segment (`:param`)
3. wildcard segment (`*`) at the current node / leaf

Caching:

- Exact (no params, no wildcard) routes are stored in `this.routes` for very fast lookup.
- Dynamic routes are cached in `resolvedRoutes` (LRU-ish by reinsertion) with max size `500`.

---

## Recipes

### Query + param validation

```ts
import { Route } from "./src/Route";
import { Source } from "./src/ValidationSource";
import * as v from "./src/ValidationUtils";

app.mount(
  new Route("GET", "/users/:id", async (c, data) => {
    const id = data.get("id");
    const page = data.get("page");
    c.json({ id, page });
  })
    .validate(Source.PARAM("id"), "id", v.required(), v.asString(), v.minLength(1))
    .validate(Source.QUERY("page"), "page", v.defaultTo("1"), v.asInt(), v.min(1)),
);
```

### Body validation

```ts
new Route("POST", "/items", async (c, data) => {
  const body = data.get("body");
  c.setStatus(201).json({ message: "Item created", data: body });
}).validate(
  Source.JSON(),
  "body",
  v.required(),
  v.asObject(),
  v.shape({
    name: v.required(),
    tags: v.optional(v.asArrayOf(v.asString())),
  }),
);
```

### Timeouts

```ts
import { timeout } from "./src/Middleware";

app.use(timeout(2500));
```

If downstream exceeds 2500ms, Xerus sends a 504 JSON error response (if nothing has been written yet).

### CORS

```ts
import { cors } from "./src/Middleware";

app.use(cors({ origin: "https://example.com", credentials: true }));
```

### Rate limiting

```ts
import { rateLimit } from "./src/Middleware";

app.use(rateLimit({ windowMs: 60_000, max: 100 }));
```

### CSRF protection

```ts
import { csrf } from "./src/Middleware";

app.use(csrf({ headerName: "x-csrf-token", cookieName: "csrf_token" }));
```

### Response compression

```ts
import { compress } from "./src/Middleware";

app.use(compress({ thresholdBytes: 1024, preferBrotli: true }));
```

### WebSocket chat example

```ts
import { WSRoute, WSMethod } from "./src/WSRoute";
import { Source } from "./src/ValidationSource";
import * as v from "./src/ValidationUtils";

app.mount(
  new WSRoute(WSMethod.OPEN, "/ws/chat", async (c) => {
    c.ws.send("👋 Welcome!");
  }),

  new WSRoute(WSMethod.MESSAGE, "/ws/chat", async (c, data) => {
    const msg = data.get("msg");
    c.ws.send(`echo: ${msg}`);
  }).validate(Source.WS_MESSAGE(), "msg", v.required(), v.asString(), v.maxLength(500)),

  new WSRoute(WSMethod.CLOSE, "/ws/chat", async (c) => {
    console.log("closed", c.code, c.reason);
  }),
);
```

---

## API reference

This section is a condensed reference of the main exported surface as represented in the code.

### `BodyType`

**File:** `src/BodyType.ts`

```ts
export enum BodyType {
  JSON = "json",
  TEXT = "string",
  FORM = "form",
  MULTIPART_FORM = "multipart_form",
}
```

Used with `HTTPContext.parseBody(...)`.

---

### `ContextState`

**File:** `src/ContextState.ts`

```ts
export enum ContextState {
  OPEN = "OPEN",
  WRITTEN = "WRITTEN",
  STREAMING = "STREAMING",
  SENT = "SENT",
}
```

Internal response mutation rules.

---

### `CookieOptions`

**File:** `src/CookieOptions.ts`

Options for `HTTPContext.setCookie(...)`.

---

### `HTTPContext` (selected methods)

**Request**
- `url: URL`
- `path: string`
- `method: string`
- `params: Record<string,string>`
- `segments: string[]`
- `getHeader(name): string | null`
- `getParam(name, default?): string`
- `query(key, default?): string`
- `queries: Record<string,string>`
- `parseBody(expected: BodyType): Promise<any>`

**Response**
- `setStatus(code): this`
- `setHeader(name,value): this`
- `getResHeader(name): string | null`
- `text(str): void`
- `html(str): void`
- `json(any): void`
- `stream(rs): void`
- `file(path): Promise<void>`
- `redirect(path, status?)` / `redirect(path, query, status?)`

**Errors**
- `errorJSON(status, code, message, extra?)`
- `badRequest(...)`, `unauthorized(...)`, `forbidden(...)`, `notFound(...)`, `conflict(...)`,
  `tooManyRequests(...)`, `internalError(...)`, `serviceUnavailable(...)`, `gatewayTimeout(...)`

**Cookies**
- `getCookie(name)`
- `setCookie(name, value, options?)`
- `clearCookie(name, path?, domain?)`

---

### `Middleware`

**File:** `src/Middleware.ts`

```ts
export class Middleware<C = HTTPContext> {
  constructor(callback: (c: C, next: () => Promise<void>) => Promise<void>)
  execute(c: C, next: () => Promise<void>): Promise<void>
}
```

Built-ins:
- `logger`
- `cors(options)`
- `requestId(opts)`
- `rateLimit(opts)`
- `csrf(opts)`
- `timeout(ms, opts?)`
- `compress(opts?)`

---

### `Route`

**File:** `src/Route.ts`

```ts
new Route(method, path, handler)
  .use(...middlewares)
  .onErr(errorHandler)
  .validate(source, outKey, ...validators)
```

---

### `WSContext`

**File:** `src/WSContext.ts`

Properties:
- `ws`
- `http`
- `data` (ValidatedData)
- `message`
- `code`
- `reason`

---

### `WSRoute`

**File:** `src/WSRoute.ts`

```ts
new WSRoute(method, path, handler)
  .use(...middlewares)
  .onErr(errorHandler)
  .validate(source, outKey, ...validators)
  .compile(): WSHandler
```

---

### `Source` factory and source types

**File:** `src/ValidationSource.ts`

Use `Source.*()` to create typed sources.

---

### `embedDir` macro

**File:** `src/macros.ts`

Compile-time directory embed helper that returns:

```ts
Record<string, { content: string | number[]; type: string }>
```

Suitable for `app.embed(...)`.

---

## Design notes & gotchas

### 1) Always `await next()`

The middleware compiler will throw a `MIDDLEWARE_ERROR` if `next()` is called but not awaited.

### 2) Don’t write body twice

Writing body after `finalize()` (e.g., after `redirect` or `json`) throws a “Double Response” `SystemErr`.

### 3) Body parsing is intentionally strict

Once you parse JSON, you cannot parse FORM, and vice versa. MULTIPART is one-shot.  
This prevents bugs from re-consuming a streamed request body.

### 4) Multiple Set-Cookie headers are supported

`MutResponse` stores cookies separately and appends them properly on `send()`.

### 5) WebSocket contexts are pooled too

WS upgrade stores a pooled `HTTPContext` in `ws.data`.  
It’s released on close. Avoid leaking references.

### 6) Timeout middleware makes later writes NO-OPs

After `timeout()` triggers, `HTTPContext` methods return early instead of throwing, preventing noisy follow-on failures.

---

## License

Add your chosen license here.
