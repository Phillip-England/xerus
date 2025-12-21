# Xerus 🐿️

A fast, Bun-native web framework with:

- **HTTP + WebSocket** routing in one place
- **Onion-style middleware** (with a built-in guard that detects “forgot to `await next()`”)
- **Typed, class-based validation** via `Validator` + `TypeValidator`
- **Convenient context helpers** (cookies, redirects, body parsing, static file serving, embedding assets)

> This README documents the API surfaced by the code in `src/` (as shared in this repo snapshot).

---

## Table of contents

- [Install](#install)
- [Hello world](#hello-world)
- [Routing](#routing)
- [Middleware](#middleware)
- [Validation](#validation)
- [HTTPContext](#httpcontext)
- [Errors](#errors)
- [Static files](#static-files)
- [Embedding assets](#embedding-assets)
- [WebSockets](#websockets)
- [Route groups](#route-groups)
- [Tips & gotchas](#tips--gotchas)

---

## Install

### Requirements

- **Bun** (server runtime)

### Add to your project

If this framework lives in your workspace as a package, install it however you normally do (workspace, local path, etc).

Example (workspace / local path):

```bash
bun add ./src/xerus
```

Or if you publish it:

```bash
bun add xerus
```

---

## Hello world

Create a route by extending `XerusRoute` and mounting it into `Xerus`.

```ts
import { Xerus } from "./src/Xerus";
import { XerusRoute } from "./src/XerusRoute";
import { Method } from "./src/Method";
import type { HTTPContext } from "./src/HTTPContext";

class HelloRoute extends XerusRoute {
  method = Method.GET;
  path = "/";

  async handle(c: HTTPContext) {
    c.json({ message: "Hello, world!" });
  }
}

const app = new Xerus();
app.mount(HelloRoute);

console.log("Listening on http://localhost:8080");
await app.listen(8080);
```

---

## Routing

Routes are matched by:

- exact path segments (`/users`)
- params (`/users/:id`)
- wildcard (`/*`)

Param values are available on `c.params` and via `c.getParam("id")`.

```ts
class UserRoute extends XerusRoute {
  method = Method.GET;
  path = "/users/:id";

  async handle(c: HTTPContext) {
    const id = c.getParam("id");
    c.json({ id });
  }
}
```

---

## Middleware

Middleware uses an onion pattern:

- Each middleware receives `(c, next)`
- You **must** `await next()` if you want downstream code to run
- Xerus detects the common bug `next()` (not awaited) and throws `SystemErrCode.MIDDLEWARE_ERROR`

```ts
import { Middleware } from "./src/Middleware";

const myMiddleware = new Middleware(async (c, next) => {
  const start = performance.now();
  await next();
  const ms = performance.now() - start;
  console.log("Handled in", ms);
});
```

### Global middleware

```ts
const app = new Xerus();
app.use(myMiddleware);
```

### Per-route middleware

```ts
class RouteWithMw extends XerusRoute {
  method = Method.GET;
  path = "/mw";

  constructor() {
    super();
    this.use(myMiddleware);
  }

  async handle(c: HTTPContext) {
    c.text("ok");
  }
}
```

### Built-in middleware helpers

In `src/Middleware.ts`:

- `logger`
- `cors(options)`
- `requestId({ headerName, storeKey, generator })`
- `rateLimit({ windowMs, max, key, message })`
- `csrf({ cookieName, headerName, secureCookie, sameSite, path, ignoreMethods, ensureCookieOnSafeMethods })`
- `timeout(ms, { message })`
- `compress({ thresholdBytes, preferBrotli })`

Example:

```ts
import { logger, cors, requestId, rateLimit } from "./src/Middleware";

const app = new Xerus();
app.use(
  logger,
  cors({ origin: "*" }),
  requestId(),
  rateLimit({ windowMs: 10_000, max: 100 })
);
```

---

## Validation

Xerus supports **class-based validation** with:

- `Validator` (plugs into the middleware chain)
- `TypeValidator` interface (`validate(c)` method)
- `Source.*()` to choose where raw input comes from

Validated instances are stored on `c.data` under the validator’s `storeKey` and can be retrieved with:

- `c.resolve(MyType)` (default store key is the class name)
- or `c.getStore("customKey")` if you configured `storeKey`

### 1) Define a validator type

A validator type must:

- have a `constructor(raw: any)`
- implement `validate(c)` (can throw on invalid)

```ts
import type { TypeValidator } from "./src/TypeValidator";
import type { HTTPContext } from "./src/HTTPContext";
import { SystemErr } from "./src/SystemErr";
import { SystemErrCode } from "./src/SystemErrCode";

class CreateUserBody implements TypeValidator {
  username: string;
  email: string;

  constructor(raw: any) {
    this.username = raw?.username ?? "";
    this.email = raw?.email ?? "";
  }

  async validate(_c: HTTPContext) {
    if (this.username.length < 3) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "username must be at least 3 chars");
    }
    if (!this.email.includes("@")) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "email must be valid");
    }
  }
}
```

### 2) Attach it to a route

Attach validators by pushing them into `this.validators` (a `Validator[]` list) in your route constructor (or `onMount()`).

```ts
import { Validator } from "./src/Validator";
import { Source } from "./src/ValidationSource";

class CreateUserRoute extends XerusRoute {
  method = Method.POST;
  path = "/users";

  constructor() {
    super();
    this.validators.push(
      Validator.from(Source.JSON(), CreateUserBody)
    );
  }

  async handle(c: HTTPContext) {
    const body = c.resolve(CreateUserBody); // instance of CreateUserBody
    c.setStatus(201).json({ message: "User created", user: body });
  }
}
```

### Validation sources

- `Source.JSON()` → `await c.parseBody(BodyType.JSON)`
- `Source.FORM(formMode?)` → `await c.parseBody(BodyType.FORM, { formMode })`
- `Source.QUERY(key?)` → query param(s)
- `Source.PARAM(key?)` → route param(s)
- `Source.WSMESSAGE()` → raw WS message (also mirrored to `c._wsMessage`)
- `Source.CUSTOM(provider, name?)` → your async provider function

Form modes:

- `"last"` (default) → `{ [k]: lastValue }`
- `"multi"` → `{ [k]: string | string[] }`
- `"params"` → `URLSearchParams`

---

## HTTPContext

`HTTPContext` is the per-request object for HTTP handlers. It offers:

### Request info

- `c.req` (native `Request`)
- `c.path`, `c.method`, `c.route`
- `c.params`, `c.getParam(name)`
- `c.queries`, `c.query(key)`

### Response helpers

- `c.setStatus(code)`
- `c.setHeader(name, value)`
- `c.text(str)`
- `c.html(html)`
- `c.json(obj)`
- `c.stream(readableStream)`
- `await c.file(path)` (Bun file send)

### Redirect

```ts
c.redirect("/login"); // 302 default
c.redirect("/login", 301);
c.redirect("/search", { q: "bun", page: 2 }, 302);
```

### Cookies

```ts
c.setCookie("session", "abc123", { httpOnly: true, sameSite: "Lax" });
const session = c.getCookie("session");
c.clearCookie("session");
```

### Body parsing

```ts
import { BodyType } from "./src/BodyType";

const text = await c.parseBody(BodyType.TEXT);
const json = await c.parseBody<{ a: number }>(BodyType.JSON);

const formLast = await c.parseBody(BodyType.FORM); // default last
const formMulti = await c.parseBody(BodyType.FORM, { formMode: "multi" });
const formParams = await c.parseBody(BodyType.FORM, { formMode: "params" });

const fd = await c.parseBody(BodyType.MULTIPART_FORM);
```

Body re-parse rules are enforced to prevent surprising behavior (e.g. JSON → FORM is blocked).

---

## Errors

Xerus uses `SystemErr` + `SystemErrCode` for common errors, and maps them to JSON responses via `SystemErrRecord`.

Common codes:

- `FILE_NOT_FOUND` → 404
- `BODY_PARSING_FAILED` → 400
- `VALIDATION_FAILED` → 400
- `ROUTE_ALREADY_REGISTERED` → 409
- `ROUTE_NOT_FOUND` → 404
- `INTERNAL_SERVER_ERR` → 500
- `WEBSOCKET_UPGRADE_FAILURE` → 500
- `HEADERS_ALREADY_SENT` → logs only
- `MIDDLEWARE_ERROR` → 500 + helpful hint

### Global error handler

```ts
app.onErr(async (c, err) => {
  c.errorJSON(500, "UNCAUGHT", "Uncaught error", { detail: err?.message ?? String(err) });
});
```

### Per-route error handler

Each route can register an error handler via `onErr(...)` (stored on the route instance/blueprint).

---

## Static files

Serve a directory:

```ts
app.static("/static", "./public");
```

- Requests to `/static/*` are resolved under `./public`
- Path traversal is prevented by checking resolved paths stay inside the root

---

## Embedding assets

Embed a directory at build time using `embedDir()`:

```ts
import { embedDir } from "./src/macros";

const files = embedDir("/absolute/path/to/public");
app.embed("/assets", files);
```

This registers a GET route that serves from the embedded map.

---

## WebSockets

WebSocket routing uses the same path matching and validator pipeline.

### Upgrade

When a GET request hits a path that has WS blueprints registered and the request has `Upgrade: websocket`, Xerus upgrades it.

### WS context

WS handlers receive a `WSContext`:

- `c.ws` → Bun `ServerWebSocket`
- `c.http` → the underlying `HTTPContext`
- `c.message` → on `message` event
- `c.code`, `c.reason` → on `close` event

Validators can run for WS events too. `Validator.asMiddleware()` will pass `c._wsContext ?? c` into `instance.validate(...)` so your validator can accept either context.

### Closing on validation errors

If WS route execution throws, Xerus closes the socket with code `1008` (policy violation) and a short reason.

---

## Route groups

Use `RouteGroup` to mount multiple routes under a shared prefix and middleware stack.

```ts
import { RouteGroup } from "./src/RouteGroup";
import { logger } from "./src/Middleware";

const group = new RouteGroup(app, "/api", logger);
group.mount(UserRoute).mount(CreateUserRoute);
```

---

## Tips & gotchas

### 1) Always `await next()`

If you call `next()` without awaiting it, Xerus throws a `MIDDLEWARE_ERROR` and returns a helpful JSON error.

### 2) Don’t double-write the response

Once a handler finalizes the response (e.g. after `redirect()`), attempting to write again throws an error.

### 3) Prefer validators for request data

Validators run before `preHandle()` and before your route middleware chain. Store and retrieve validated types through:

- `c.resolve(MyType)` (default)
- or `c.getStore("customKey")`

### 4) Compression is opt-in

Use `compress()` middleware if you want response compression. It only compresses string / byte-like bodies over a threshold and respects `Accept-Encoding`.

---

## License

Add your project’s license here.
