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

app.use(XerusMw.serveStaticFiles)
app.use(XerusMw.serveFavicon)

app.use(async (ctx: XerusCtx) => {
	ctx.setHeader("Content-Type", "text/html")
})

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
	ctx.send(200, renderToString(<SomeComponent text="/" />))
})

app.get("/about", async (ctx: XerusCtx) => {
	ctx.send(200, renderToString(<SomeComponent text='/about' />))
})

app.run(8080)
```

## Features

### Simple Routing
A simple Hello, World application:

```ts
let app = new Xerus();

app.get('/', async (ctx: RequestCtx) => {
    ctx.setHeader("Content-Type", "text/html")
    ctx.send(200, "<h1>Hello, World!</h1>")
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

app.use(async (ctx: RequestCtx) => {
    ctx.setHeader("Content-Type", "text/html")
})

app.get('/', async (ctx: RequestCtx) => {
    ctx.send(200, "<h1>Hello, World!</h1>")
})

app.run(8080)
```

### JSX
Strings are lame:

```tsx
const app = new Xerus()

app.use(async (ctx: RequestCtx) => {
	setHeader(ctx, "Content-Type", "text/html")
})

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
	ctx.send(200, renderToString(<SomeComponent text="Home" />))
})

app.run(8080)
```

### Static Files / Favicon
Serving static files and `/favicon.ico` is easy:

```ts
const app = new Xerus()

app.use(XerusMw.serveStaticFiles)
app.use(XerusMw.serveFavicon)
```

Now all files located in `/static` will be available on the server.