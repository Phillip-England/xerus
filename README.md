# Xerus

An Express-like framework for Bun.

## Installation

With bun 1.1.12 or greater installed, run:
```bash
bun create phillip-england/xerus <app-name>
cd <app-name>
bun install
```

## Quickstart

Hello world example:
```ts
import { Xerus, setBody, setHeader, type AppContext } from "./xerus/package"

const app = new Xerus()

app.use(async (ctx: AppContext) => {
	setHeader(ctx, "Content-Type", "text/html")
})

app.get("/", async (ctx: AppContext) => {
	setBody(ctx, "<h1>Hello, World!</h1>")
})

app.run(8080)
```

## Type-System
Xerus is really just a series of types and classes built around the Bun http utilites. To really get a feel for how Xerus works, read over the type definitions. 

Here is a list of them:

1. `Xerus`
2. `Router`
3. `Route`
4. `HandlerFunc`
5. `MiddlewareFunc`
6. `AppContext`
7. `Cookie`
8. `MockResponse`

## Features

### Simple Routing
A simple Hello, World application:

```ts
let app = new Xerus();

app.get('/', async (ctx: AppContext) => {
    setHeader(ctx, "Content-Type", "text/html")
    setBody(ctx, "<h1>Hello, World!</h1>")
})

app.run(8080)
```

Then serve using:
```bash
bun run dev
```

now visit `localhost:8080/`

### Middleware
Maybe we want all routes to return html? Boom:

```ts
let app = new Xerus();

app.use(async (ctx: AppContext) => {
    setHeader(ctx, "Content-Type", "text/html")
})

app.get('/', async (ctx: AppContext) => {
    setBody(ctx, "<h1>Hello, World!</h1>")
})

app.run(8080)
```

### JSX
And using strings is lame:

```tsx
let app = new Xerus();

app.use(async (ctx: AppContext) => {
    setHeader(ctx, "Content-Type", "text/html")
})

app.get('/', async (ctx: AppContext) => {
    setBody(ctx, $c(<SomeComponent/>))
})

app.run(8080)
```
