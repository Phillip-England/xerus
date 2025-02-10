# Xerus
A minimal http framework for Bun!

## Installation
Install Xerus from github.

```bash
bun add github:phillip-england/xerus
```

## Hello, World!
Get a server up and running!

```ts
import { type Context, Xerus } from "xerus/xerus";

const app = new Xerus();

app.get("/", async (c: Context) => {
  return c.html("<h1>Hello, World!</h1>");
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

## Middleware
In Xerus, middlewares are either applied globally, or chained onto the end of a specific handler.

### Creating Custom Middleware
Xerus provides the `makeMiddleware` function to be used for creating custom middleware.

Creating a middleware with `makeMiddleware` and applying it globally:
```ts
export const echo = makeMiddleware(async (ctx, next) => {
  console.log('echo')
  return await next();
});

app.use(echo)
```

### Chaining Middleware on a Handler
Middleware can also be chained onto the end of a handler

Using the global store to set a value in a middleware:
```ts
export const testStore = makeMiddleware(async (ctx, next) => {
  ctx.store.test = "testing"; // setting value in global store
  return await next();
});
```

Chaining `testStore` to the end of a handler and retrieving the value from the global store:
```ts
app.get("/testing-store", async (c: Context) => {
  return c.html(`<h1>${c.store.test}</h1>`); // using value from global store
}, testStore);
```

### Built-In Middleware
Xerus provides a few built-in middlewares as listed below.

`logger` is used to log request details.
`cors` is used to setup default cors configuration.
`errorHandler` is used to setup default error handling for each request.

### Custom Cors
`customCors` is a provided function which allows us to create new middleware with custom cors configuration. It is used like so:

```ts
const corsMiddleware = customCors({
  origin: "http://example.com",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Custom-Header"],
  credentials: true,
  maxAge: 600,
});

app.get("/cors-test", async (ctx) => {
  return ctx.json({ message: "CORS is working!" });
}, corsMiddleware); // chaining the middleware on here
```

### Custom Error Handling
`Xerus` had a method called, `setErrorHandler` which allows us to override the default error handling and setup our own custom solution. Here is an example of what setting up custom error handling looks like:

```ts
const app = new Xerus();

app.use(errorHandler)

app.setErrorHandler(async (ctx, err) => {
  console.error("Custom Error:", err);
  return ctx.json({
    error: "Something went wrong",
    details: (err as Error).message,
  }, 500);
});
```

## Cookies
`Context` provides a few methods, `setCookie` and `deleteCookie`, to work with cookies.

Setting a cookie:
```ts
app.get("/set-cookie", async (c: Context) => {
  c.setCookie("user", "phillip", { httpOnly: true, maxAge: 3600 });
  return c.html("<h1>Cookie Set!</h1>");
});
```

Deleting a cookie:
```ts
app.get("/delete-cookie", async (c: Context) => {
  c.deleteCookie("user");
  return c.html("<h1>Cookie Deleted!</h1>");
});
```

## Response Methods
`Context` provides a few methods to enable easy response handling.

JSON support:
```ts
app.post("/", async (c: Context) => {
  return c.json({ "user": "phillip" }, 200);
});
```

HTML support:
```ts
app.get("/", async (c: Context) => {
  return c.html("<h1>GET /</h1>");
});
```

## Dynamic Paths
Xerus supports dynamic paths.

```ts
app.get("/user/:id", async (c: Context) => {
  return c.json({ "user": "phillip", "id": c.params.id });
});
```

## Query Params
Xerus supports query parameters.

```ts
app.get("/search", async () => {
  const term = ctx.query("q");
  return ctx.html(`<h1>${term}</h1>`);
});
```

## Wildcards
Xerus supports wildcard paths.

```ts
app.get("/wild/*", async (c) => {
  return c.json({ path: c.params["*"] });
});
```

