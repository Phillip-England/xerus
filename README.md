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
const app = new Xerus()

app.use(XerusMw.serveStaticFiles)
app.use(XerusMw.serveFavicon)

app.use(async (ctx: XerusCtx) => {
	ctx.res.setHeader("Content-Type", "text/html")
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
	ctx.res.setBody(renderToString(<SomeComponent text="/" />))
})

app.get("/about", async (ctx: XerusCtx) => {
	ctx.res.setBody(renderToString(<SomeComponent text='/about' />))
})

app.run(8080)
```

## Features

### Simple Routing
A simple Hello, World application:

```ts
let app = new Xerus();

app.get('/', async (ctx: RequestCtx) => {
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

app.use(async (ctx: RequestCtx) => {
    setHeader(ctx, "Content-Type", "text/html")
})

app.get('/', async (ctx: RequestCtx) => {
    setBody(ctx, "<h1>Hello, World!</h1>")
})

app.run(8080)
```

### JSX
And using strings is lame:

```tsx
const app = new Xerus()

app.use(async (ctx: RequestCtx) => {
	setHeader(ctx, "Content-Type", "text/html")
})

const SomeComponent = () => {
    return (
        <>
            <h1>Hello, world!</h1>
        </>
    )
}

app.get("/", async (ctx: RequestCtx) => {
	setBody(ctx, comp(<SomeComponent />))
})

app.run(8080)
```
