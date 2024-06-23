# Xerus

An Express-like framework for Bun.

## Installation

With bun 1.1.12 or greater installed, run:
```bash
bun create phillip-england/xerus <app-name>
cd <app-name>
bun install
bun run dev
```

visit `localhost:8080/`

## Quickstart

Hello world example:
```ts
const app = new Xerus()

app.global(XerusMw.serveStaticFiles)
app.global(XerusMw.serveFavicon)

const SomeComponent = (props: {
    text: string
}) => {
    return (
        <>  
            <h1>{props.text}</h1>
            <a href='/'>Home</a>
            <a href='/about'>About</a>
        </>
    )
}

app.get("/", async (ctx: XerusCtx) => {
	ctx.html(200, renderToString(<SomeComponent text="/" />))
})

app.get("/about", async (ctx: XerusCtx) => {
	ctx.html(200, renderToString(<SomeComponent text='/about' />))
})

type User = {
    name: string
}

app.get("/api/users", async (ctx: XerusCtx) => {
    const users: User[] = [
        { name: "Alice" },
        { name: "Bob" }
    ]
    ctx.json(200, users)
})

app.run(8080)
```

## Features

### Simple Routing
A simple Hello, World application:

```ts
let app = new Xerus();

app.get('/', async (ctx: RequestCtx) => {
    ctx.html(200, "<h1>Hello, World!</h1>")
})

app.run(8080)
```

Then serve using:
```bash
bun run dev
```

now visit `localhost:8080/`

### Middleware
Maybe we want all routes to say hi? Boom:

```ts
let app = new Xerus();

app.global(async (ctx: RequestCtx) => {
    console.log('hi')
})

app.get('/', async (ctx: RequestCtx) => {
    ctx.html(200, "<h1>Hello, World!</h1>")
})

app.run(8080)
```

### JSX
Strings are lame:

```tsx
const app = new Xerus()

const SomeComponent = (props: {
    text: string
}) => {
    return (
        <>  
            <h1>{props.text}</h1>
            <a href='/'>Home</a>
            <a href='/about'>About</a>
        </>
    )
}

app.get("/", async (ctx: XerusCtx) => {
	ctx.html(200, renderToString(<SomeComponent text="Home" />))
})

app.run(8080)
```

### Static Files / Favicon
Serving static files and `/favicon.ico` is easy:

```ts
const app = new Xerus()

app.global(XerusMw.serveStaticFiles)
app.global(XerusMw.serveFavicon)
```

Now all files located in `/static` will be available on the server.

### Routers
What if you want to apply a middleware to only *certain* routes? That's what `Router` is for.

Spawn a `Router`:
```ts
const app = new Xerus()

let apiRouter = app.spawnRouter('/api')

type User = {
    name: string
}

apiRouter.get("/users", async (ctx: XerusCtx) => {
    const users: User[] = [
        { name: "Alice" },
        { name: "Bob" }
    ]
    ctx.json(200, users)
})
```

at `localhost:8080` you'll see:
```json
[{"name":"Alice"},{"name":"Bob"}]
```