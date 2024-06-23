# Xerus

An Express-like framework for Bun.

## Installation

With bun 1.1.12 or greater installed, run:
```bash
bun create phillip-england/xerus <app-name>
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

Hello, World example @GET /
```ts
let app = new Xerus();
app.get('/', async (ctx: AppContext) => {
    setHeader(ctx, "Content-Type", "text/html")
    setBody(ctx, "<h1>Hello, World!</h1>")
})
```