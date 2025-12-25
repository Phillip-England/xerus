# Xerus

Structured servers in Bun

## Table of Contents

- [Getting Started](#getting-started)
- [Routes](#routes)
- [Validators](#validators)
- [Services](#services)
- [HTTPContext](#httpcontext)
- [Responses](#responses)
- [Cookies](#cookies)
- [Body Parsing](#body-parsing)
- [WebSockets](#websockets)
- [Errors](#errors)
- [Route Groups](#route-groups)
- [Static Files & Embed](#static-files--embed)
- [Plugins](#plugins)
- [Built-in Services](#built-in-services)
- [Globals (App-level Injectables)](#globals-app-level-injectables)
- [API Notes](#api-notes)

---

## Installation
```bash
bun add github:phillip-england/xerus#v0.0.70
```

## What is Xerus?

Xerus is a small, structured HTTP + WebSocket framework for Bun. You define routes as classes, optionally attach **validators** (for typed input) and **services** (for shared logic + lifecycle hooks). Xerus runs validators first, then services, then your route handler.

**Key ideas:**

- **Routes are classes** (method + path + handle).
- **Validators return values** and are read via `c.validated(MyValidator)`.
- **Services are class-constructed per-request scope** and read via `c.service(MyService)`.
- **Lifecycle hooks** for services: `init`, `before`, `after`, `onError`.
- **WebSockets reuse the same HTTPContext** with per-event reset (OPEN / MESSAGE / CLOSE / DRAIN).

---

## Getting Started

Create an app, mount routes, and listen.

```ts
// app.ts
import { Xerus } from "./src/Xerus";
import { XerusRoute } from "./src/XerusRoute";
import { Method } from "./src/Method";
import { json } from "./src/std/Response";
import type { HTTPContext } from "./src/HTTPContext";

class HomeRoute extends XerusRoute {
  method = Method.GET;
  path = "/";

  async handle(c: HTTPContext) {
    json(c, { message: "Hello, world!" });
  }
}

const app = new Xerus();
app.mount(HomeRoute);

await app.listen(8080);
```

Notes:

- Routes are mounted with `app.mount(RouteCtor)`.
- Each request creates / reuses an `HTTPContext` from a pool.
- Responses are built through `c.res` or helpers in `std/Response`.

---

## Routes

A route is a class extending `XerusRoute`: it declares a `method`, `path`, and implements `handle(c)`.

```ts
import { XerusRoute } from "./src/XerusRoute";
import { Method } from "./src/Method";
import { json, text } from "./src/std/Response";
import type { HTTPContext } from "./src/HTTPContext";

class Hello extends XerusRoute {
  method = Method.GET;
  path = "/hello/:name";

  async handle(c: HTTPContext) {
    // path params are stored on c.params
    const name = c.params["name"] ?? "world";
    json(c, { hello: name });
  }
}

class Ping extends XerusRoute {
  method = Method.GET;
  path = "/ping";

  async handle(c: HTTPContext) {
    text(c, "pong");
  }
}
```

Route lifecycle hooks (optional):

- `onMount()` — runs once at mount-time (during blueprint creation).
- `validate(c)` — runs after validators list has executed.
- `preHandle(c)` / `postHandle(c)` — runs around `handle`.
- `onFinally(c)` — always runs (success or error).
- `onErr(handler)` — attach a per-route error handler.

---

## Validators

Validators are constructors listed on routes/services as `validators = [MyValidator]`. Each validator must implement `validate(c)` and must **return a value**. That returned value is stored on the context and retrieved via `c.validated(MyValidator)`.

```ts
import type { HTTPContext } from "./src/HTTPContext";
import type { XerusValidator } from "./src/XerusValidator";
import { Method } from "./src/Method";
import { XerusRoute } from "./src/XerusRoute";
import { query } from "./src/std/Request";
import { json } from "./src/std/Response";

class SearchQuery implements XerusValidator<{ search: string }> {
  validate(c: HTTPContext) {
    // std/Request helpers exist too:
    const s = query(c, "search", "");
    return { search: s };
  }
}

class SearchRoute extends XerusRoute {
  method = Method.GET;
  path = "/search";
  validators = [SearchQuery];

  async handle(c: HTTPContext) {
    const v = c.validated(SearchQuery);
    json(c, { youSearchedFor: v.search });
  }
}
```

Important validator rules:

- **Validators run before services**, and before route hooks.
- If a validator returns an object, Xerus can optionally deep-freeze it (enabled by default).
- If a validator throws, Xerus converts common validation errors (including Zod-style errors) into a 400 response.
- `Validator.Ctx()` and `Validate()` are removed; use ctor lists.

---

## Services

Services are constructors listed on routes as `services = [MyService]`. Xerus will instantiate services per-request (within the request scope), resolve dependencies, run lifecycle hooks, and store instances on the context so you can call `c.service(MyService)`.

```ts
import type { HTTPContext } from "./src/HTTPContext";
import { Method } from "./src/Method";
import { XerusRoute } from "./src/XerusRoute";
import { json } from "./src/std/Response";

class MetricsService {
  private start = 0;

  async before(_c: HTTPContext) {
    this.start = performance.now();
  }

  async after(_c: HTTPContext) {
    const ms = performance.now() - this.start;
    console.log("request ms:", ms.toFixed(2));
  }
}

class UsersService {
  users = ["ada", "grace", "linus"];
  async init(_c: HTTPContext) {
    // run once per request scope when service is first constructed
  }
}

class UsersRoute extends XerusRoute {
  method = Method.GET;
  path = "/users";
  services = [MetricsService, UsersService];

  async handle(c: HTTPContext) {
    const users = c.service(UsersService);
    json(c, { users: users.users });
  }
}
```

### Service dependency graph

A service can declare its own dependencies:

```ts
class AService {
  services = [BService, CService];   // service deps
  validators = [InputValidator];     // validator deps
}
```

- Dependencies are resolved before `init()`.
- `before()` hooks run in dependency order; `after()` runs in reverse order.
- On error, `onError()` runs in reverse order, then route error handling kicks in.

---

## HTTPContext

The `HTTPContext` is the per-request (and per-WS-event) state container. Xerus pools contexts for performance, and resets them between uses.

### Request fields

- `c.req` — Bun Request
- `c.path` — URL pathname (normalized)
- `c.method` — HTTP method (or WS event method)
- `c.params` — route params map
- `c.route` — “METHOD /path” string

### Response builder

- `c.res` — MutResponse (status/headers/body/cookies)
- `c.finalize()` — stops handler chain after body is set
- `c.ensureConfigurable()` — guards header writes
- `c.ensureBodyModifiable()` — guards body writes

### Context registries

- `c.validated(MyValidator)` — read validated value
- `c.service(MyService)` — read service instance
- `c.global(MyGlobal)` — read a global injectable registered on the app
- `c.cookies.request` / `c.cookies.response` — cookie access

---

## Responses

You can write responses directly with `c.res` or use helpers from `std/Response`. Helpers finalize the response and prevent accidental double writes.

```ts
import { json, text, html, redirect, setHeader, setStatus } from "./src/std/Response";

json(c, { ok: true });         // Content-Type application/json
text(c, "hello");              // text/plain (if not already set)
html(c, "<h1>Hi</h1>");        // text/html
redirect(c, "/login");         // 302 + Location
setHeader(c, "X-Foo", "bar");  // header only
setStatus(c, 201);             // status only
```

### Streaming + Files

- `stream(c, readableStream)` sets streaming mode (headers become immutable).
- `await file(c, path)` sends a file using `Bun.file` and sets Content-Type.

---

## Cookies

Xerus exposes request cookies and response cookie writers via `c.cookies`. Response cookies are written as `Set-Cookie` headers when the response is sent.

```ts
// Read cookie
const session = c.cookies.request.get("session");

// Set cookie
c.cookies.response.set("session", "abc123", {
  path: "/",
  httpOnly: true,
  sameSite: "Lax",
});

// Clear cookie
c.cookies.response.clear("session", { path: "/" });
```

---

## Body Parsing

Xerus includes a strict-ish body parser with guarded re-parsing rules. Parsing helpers live in `std/Body`.

```ts
import { jsonBody, textBody, formBody, multipartBody } from "./src/std/Body";
import { BodyType } from "./src/BodyType";

// JSON
const data = await jsonBody(c); // or parseBody(c, BodyType.JSON)

// TEXT
const s = await textBody(c);

// FORM (application/x-www-form-urlencoded)
const form = await formBody(c);

// MULTIPART (multipart/form-data)
const fd = await multipartBody(c);
```

Parsing rules (high level):

- JSON and FORM are mutually exclusive once parsed (no reparse across them).
- Multipart consumes the body and cannot be re-parsed into something else.
- Strict Content-Type enforcement is available via `opts.strict`.

---

## WebSockets

Xerus supports WebSocket upgrade routes automatically when you mount WS event routes on the same path. A GET route at a path will upgrade if the route trie contains WS handlers for that same path and the request includes `Upgrade: websocket`.

### WS event methods

- `Method.WS_OPEN`
- `Method.WS_MESSAGE`
- `Method.WS_CLOSE`
- `Method.WS_DRAIN`

```ts
import { XerusRoute } from "./src/XerusRoute";
import { Method } from "./src/Method";
import type { HTTPContext } from "./src/HTTPContext";
import { ws } from "./src/std/Request";

// Same path, different WS event methods:

class ChatOpen extends XerusRoute {
  method = Method.WS_OPEN;
  path = "/chat";
  async handle(c: HTTPContext) {
    ws(c).send("welcome");
  }
}

class ChatMessage extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/chat";

  // validators/services work the same as HTTP:
  // validators = [MessageValidator]
  // services = [AuthService]

  async handle(c: HTTPContext) {
    const w = ws(c);
    // message available on WSContext
    w.send("echo: " + String(w.message));
  }
}

class ChatClose extends XerusRoute {
  method = Method.WS_CLOSE;
  path = "/chat";
  async handle(_c: HTTPContext) {
    // cleanup per close
  }
}
```

### WSContext

Inside WS routes, use `ws(c)` to access the WebSocket wrapper:

- `ws(c).send(...)`, `ping`, `pong`, `close`
- `ws(c).message` is populated for MESSAGE events
- `ws(c).code` / `ws(c).reason` for CLOSE events

---

## Errors

Xerus uses `SystemErr` (with `SystemErrCode`) for framework-level errors. The framework maps these to JSON error responses via `SystemErrRecord`.

```ts
import { SystemErr } from "./src/SystemErr";
import { SystemErrCode } from "./src/SystemErrCode";

throw new SystemErr(SystemErrCode.ROUTE_NOT_FOUND, "Nope");
```

Custom handlers:

- `app.onNotFound(RouteCtor)` — fallback route when nothing matches.
- `app.onErr(RouteCtor)` — app-wide error handler route.
- `route.onErr(handler)` — per-route error handler function.

---

## Route Groups

Use `RouteGroup` to mount multiple routes under a prefix.

```ts
import { Xerus } from "./src/Xerus";
import { RouteGroup } from "./src/RouteGroup";

const app = new Xerus();

new RouteGroup(app, "/api")
  .mount(UsersRoute, SearchRoute, PingRoute);
```

---

## Static Files & Embed

Xerus can serve static files from disk or embed an in-memory file map.

### Static directory

```ts
app.static("/www", "./www");
```

Requests to `/www/*` map into that directory. Paths are resolved and checked to prevent directory traversal.

### Embed route

```ts
app.embed("/docs", {
  "/index.html": { content: "<h1>Hi</h1>", type: "text/html" }
});
```

Useful for bundling documentation/assets. You can generate embedded maps using `embedDir()` in `macros.ts`.

---

## Plugins

Plugins provide structured hooks for app lifecycle: connect, route registration, pre-listen, and shutdown.

```ts
import type { XerusPlugin } from "./src/XerusPlugin";
import type { Xerus } from "./src/Xerus";

class MyPlugin implements XerusPlugin {
  onConnect(app: Xerus) {
    // called when plugin is registered
  }

  onRegister(app: Xerus, route: any) {
    // called when routes are mounted
  }

  onPreListen(app: Xerus) {
    // called before listen()
  }

  onShutdown(app: Xerus) {
    // called on SIGINT/SIGTERM shutdown
  }
}

app.plugin(MyPlugin);
```

---

## Built-in Services

Xerus ships a few opt-in services you can mount globally or per-route.

### CORSService

Adds CORS headers and auto-handles OPTIONS preflight by finalizing the response.

```ts
import { CORSService } from "./src/CORSService";

app.use(class extends CORSService {
  constructor() {
    super({
      origin: true, // reflect request origin
      credentials: true,
      methods: ["GET","POST","PUT","DELETE","OPTIONS"],
    });
  }
});
```

### CSRFService

Sets a CSRF cookie and validates a matching header for non-safe methods.

```ts
import { CSRFService } from "./src/CSRFService";

app.use(class extends CSRFService {
  constructor() {
    super({
      cookieName: "XSRF-TOKEN",
      headerName: "X-XSRF-TOKEN",
    });
  }
});
```

### RateLimitService

In-memory rate limiting (Map store) with standard rate headers.

```ts
import { RateLimitService } from "./src/RateLimitService";

app.use(class extends RateLimitService {
  constructor() {
    super({ limit: 120, windowMs: 60_000 });
  }
});
```

### LoggerService

Logs request method + path + duration using service hooks.

```ts
import { LoggerService } from "./src/LoggerService";

app.use(LoggerService);
```

---

## Globals (App-level Injectables)

Xerus supports global singletons you can access via `c.global(MyType)`. Register them with `app.provide()` or `app.injectGlobal()`.

```ts
class Config {
  storeKey = "Config";
  apiKey = "secret";
}

const app = new Xerus();
app.provide(Config, new Config());

class Route extends XerusRoute {
  method = Method.GET;
  path = "/cfg";
  async handle(c: HTTPContext) {
    const cfg = c.global(Config);
    json(c, { apiKey: cfg.apiKey });
  }
}
```

---

## API Notes

- Legacy helpers `Inject()`, `Validate()`, and `Validator.Ctx()` are intentionally removed. Declare ctor lists instead: `services = [...]`, `validators = [...]`.
- If you write to the response body using helpers like `json()` or `text()`, they call `c.finalize()` and stop the handler chain.
- WebSocket routes share a pooled `HTTPContext`. Xerus resets per-event scope via `resetForWSEvent()`.

---

_Xerus Documentation — generated from source layout. Add more examples as your app grows._
