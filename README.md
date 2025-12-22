# Xerus (minimal guide)

A tiny HTTP + WebSocket framework for Bun with:

- trie-based routing (static / params / wildcard)
- middleware (global + route + groups), with onion semantics
- dependency injection (app-level + route-field injection)
- validation for JSON / form / query / params / ws messages (and custom sources)
- structured error handling

---

## Install

```bash
bun add github:phillip-england/xerus#v0.0.63
```

---

## Hello HTTP

```ts
import { Xerus } from "xerus";
import { Method } from "xerus";
import { XerusRoute } from "xerus";

class HelloRoute extends XerusRoute {
  method = Method.GET;
  path = "/";

  async handle(c) {
    c.json({ message: "Hello, world!" });
  }
}

const app = new Xerus();
app.mount(HelloRoute);
await app.listen(8080);
```

---

## Routing: static, params, wildcard

```ts
import { Method, XerusRoute } from "xerus";

export class StaticRoute extends XerusRoute {
  method = Method.GET;
  path = "/about";
  async handle(c) {
    c.text("about");
  }
}

export class ParamRoute extends XerusRoute {
  method = Method.GET;
  path = "/users/:id";
  async handle(c) {
    c.json({ id: c.getParam("id") });
  }
}

export class WildcardRoute extends XerusRoute {
  method = Method.GET;
  path = "/assets/*";
  async handle(c) {
    c.text(`wildcard hit: ${c.path}`);
  }
}
```

---

## Static files + embedded assets

Serve a directory:

```ts
const app = new Xerus();
app.static("/static", "./public"); // GET /static/* -> ./public/*
```

Embed files at build time (useful for single-binary-ish deploys):

```ts
import { embedDir } from "xerus/macros" with { type: "macro" };

const embedded = embedDir("/abs/path/to/public"); // compile-time-ish helper
app.embed("/static", embedded); // GET /static/* from embedded map
```

---

## Middleware (all layers)

Middleware is `async (c, next) => { ...; await next(); ... }`.

### Global middleware

```ts
import { cors, logger, Middleware, requestId } from "xerus";

const app = new Xerus();

// Runs FIRST (before route-field Inject/Validator)
app.usePre(logger);

// Runs after route-field Inject/Validator (but before route handler)
app.use(cors(), requestId());
```

### Route middleware

```ts
class PrivateRoute extends XerusRoute {
  method = Method.GET;
  path = "/private";

  constructor() {
    super();
    this.use(
      new Middleware(async (c, next) => {
        if (!c.getHeader("authorization")) {
          c.errorJSON(401, "UNAUTHORIZED", "missing auth");
          return;
        }
        await next();
      }),
    );
  }

  async handle(c) {
    c.text("ok");
  }
}
```

### Group middleware + prefixing

```ts
import { RouteGroup } from "xerus";

const api = new RouteGroup(app, "/api", cors(), requestId());
api.mount(StaticRoute, ParamRoute);
```

### Middleware execution order (important)

For a matched route, Xerus runs:

1. `app.usePre(...)`
2. **route-field injection** (via `Inject(...)` on the route instance)
3. **route-field validation** (via `Validator.Param(...)` on the route instance)
4. `route.preHandle(c)`
5. `app.use(...)` (global middlewares)
6. `route.use(...)` (route middlewares)
7. `route.handle(c)` then `route.postHandle(c)`
8. `route.onFinally(c)` (always, even on errors)

**Onion rule:** middleware must `await next()` or you’ll get a developer error
(`MIDDLEWARE_ERROR: did not await next()`).

---

## Dependency injection

### App-level injection (available on every request)

A store is any class like:

```ts
class ConfigStore {
  storeKey = "config";
  cwd = "/tmp";
  async init(c) {
    // optional: compute per-request values
  }
}

const app = new Xerus();
app.inject(ConfigStore);

// later in a route:
const cfg = c.getStore<ConfigStore>("config");
```

### Route-field injection (also writes to `c.store`)

```ts
import { Inject } from "xerus";

class UserRepo {
  storeKey = "userRepo";
  async init(c) {
    // init per-request if you want
  }
}

class NeedsRepo extends XerusRoute {
  method = Method.GET;
  path = "/repo";

  // inject + also assigns to `this.repo` for this request
  repo = Inject(UserRepo);

  async handle(c) {
    const r1 = this.repo; // route field
    const r2 = c.getStore<UserRepo>("userRepo"); // store
    c.json({ same: r1 === r2 });
  }
}
```

---

## Validation (all sources)

Validation uses a **TypeValidator**:

- constructor accepts raw input
- `validate(c)` throws on failure
- the validated instance is stored on `c.data[storeKey]`
- with route-field validators, it’s also assigned to the route property for the
  request

```ts
import { HTTPContext, SystemErr, SystemErrCode, TypeValidator } from "xerus";

export class CreateUserBody implements TypeValidator {
  username: string;
  constructor(raw: any) {
    this.username = String(raw?.username ?? "");
  }
  async validate(_c: HTTPContext) {
    if (this.username.length < 3) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "username too short",
      );
    }
  }
}
```

### JSON body

```ts
import { Source, Validator } from "xerus";

class CreateUserRoute extends XerusRoute {
  method = Method.POST;
  path = "/users";

  body = Validator.Param(Source.JSON(), CreateUserBody, "body");

  async handle(c) {
    // as a route field:
    const body = this.body;

    // or via c.data:
    // const body = (c.data as any).body as CreateUserBody;

    c.json({ ok: true, username: body.username });
  }
}
```

### Form body (urlencoded)

```ts
class LoginForm implements TypeValidator {
  email: string;
  constructor(raw: any) {
    this.email = String(raw?.email ?? "");
  }
  async validate() {
    if (!this.email.includes("@")) throw new Error("bad email");
  }
}

class LoginRoute extends XerusRoute {
  method = Method.POST;
  path = "/login";

  // FORM() defaults to { formMode: "last" }
  form = Validator.Param(Source.FORM(), LoginForm, "form");

  async handle(c) {
    c.json({ email: this.form.email });
  }
}
```

Form modes:

- `Source.FORM("last")` → `{ key: string }` (last value wins)
- `Source.FORM("multi")` → `{ key: string | string[] }`
- `Source.FORM("params")` → `URLSearchParams`

### Query string

```ts
class ActiveDirQuery implements TypeValidator {
  activeDir: string;
  constructor(raw: any) {
    this.activeDir = String(raw ?? "");
  }
  async validate() {
    if (!this.activeDir.startsWith("/")) {
      throw new Error("activeDir must be absolute");
    }
  }
}

class QueryRoute extends XerusRoute {
  method = Method.GET;
  path = "/";

  // validate a single query key
  activeDir = Validator.Param(
    Source.QUERY("activeDir"),
    ActiveDirQuery,
    "activeDir",
  );

  async handle(c) {
    c.json({ activeDir: this.activeDir.activeDir });
  }
}
```

### Path params

```ts
class UserIdParam implements TypeValidator {
  id: string;
  constructor(raw: any) {
    this.id = String(raw ?? "");
  }
  async validate() {
    if (!/^[0-9]+$/.test(this.id)) throw new Error("id must be numeric");
  }
}

class UserRoute extends XerusRoute {
  method = Method.GET;
  path = "/users/:id";

  id = Validator.Param(Source.PARAM("id"), UserIdParam, "id");

  async handle(c) {
    c.json({ id: this.id.id });
  }
}
```

### WebSocket message validation

The WS message is exposed as `Source.WSMESSAGE()` (raw string/Buffer).

```ts
class ChatMessage implements TypeValidator {
  text: string;
  constructor(raw: any) {
    this.text = String(raw ?? "");
  }
  async validate() {
    if (this.text.length === 0) throw new Error("empty message");
  }
}
```

---

## WebSockets: OPEN / MESSAGE / CLOSE / DRAIN routes

Xerus attaches WS routing to the same path (and upgrades on `GET` with
`Upgrade: websocket`).

Define one or more WS routes with the same `path` but different methods:

```ts
import { Method, Source, Validator, XerusRoute } from "xerus";

class ChatOpen extends XerusRoute {
  method = Method.WS_OPEN;
  path = "/ws/chat";
  async handle(c) {
    c.ws().send("welcome");
  }
}

class ChatMessageRoute extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/chat";

  msg = Validator.Param(Source.WSMESSAGE(), ChatMessage, "msg");

  async handle(c) {
    const ws = c.ws();
    ws.send(`echo: ${this.msg.text}`);
  }
}

class ChatClose extends XerusRoute {
  method = Method.WS_CLOSE;
  path = "/ws/chat";
  async handle(c) {
    // close info is available on c.ws().code / c.ws().reason
  }
}

class ChatDrain extends XerusRoute {
  method = Method.WS_DRAIN;
  path = "/ws/chat";
  async handle(c) {
    // backpressure drained
  }
}

const app = new Xerus();
app.mount(ChatOpen, ChatMessageRoute, ChatClose, ChatDrain);
await app.listen(8080);
```

---

## Errors, error handlers, and 404s

### Per-route error handler

```ts
class Boom extends XerusRoute {
  method = Method.GET;
  path = "/boom";

  constructor() {
    super();
    this.onErr(async (c, err) => {
      c.errorJSON(500, "BOOM", "route failed", { detail: err?.message });
    });
  }

  async handle(_c) {
    throw new Error("kaboom");
  }
}
```

### Global error handler

```ts
app.onErr(async (c, err) => {
  c.errorJSON(500, "INTERNAL", "Unhandled error", { detail: err?.message });
});
```

### 404 / Not Found

Provide a not-found handler:

```ts
app.onNotFound(async (c) => {
  c.setStatus(404).json({ error: { code: "NOT_FOUND", path: c.path } });
});
```

If you don’t set `onNotFound`, Xerus will throw a `ROUTE_NOT_FOUND` system
error.

---

## Minimal app structure

```ts
const app = new Xerus();

// global middleware
app.usePre(logger);
app.use(cors(), requestId());

// routes
app.mount(
  HelloRoute,
  StaticRoute,
  ParamRoute,
  WildcardRoute,
  CreateUserRoute,
);

// 404 + global error
app.onNotFound(async (c) => c.setStatus(404).text("not found"));
app.onErr(async (c, err) =>
  c.errorJSON(500, "INTERNAL", "error", { detail: err?.message })
);

await app.listen(8080);
```
