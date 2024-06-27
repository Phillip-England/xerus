# Xerus

A backend framework for Bun focused on ease of use and productivity. Xerus comes with JSX support and file based routing out of the box.

## Installation

With bun 1.1.12 or greater installed, run:
```bash
mkdir myapp
cd myapp
bun init
bun install xerus
```

And replace your `index.ts` with an `index.tsx`:
```bash
mv index.ts index.tsx
```

For hot-reload, place this in the `scripts` section of your `package.json`:
```json
"scripts": {
    "dev": "bun --hot run ./index.tsx"
},
```

## Quickstart

`./index.tsx`
```tsx
const app = new Xerus()

app.global(XerusMw.serveStaticFiles)
app.global(XerusMw.serveFavicon)

const router = new FileBasedRouter(app)
await router.mount('./app')

await app.run(8080)
```

`./app/+handler.tsx`
```tsx
const handler = new HandlerFile();

handler.get = async (ctx: XerusCtx) => {
    ctx.jsx(200, <h1>hello world</h1>)
}

handler.post = async (ctx: XerusCtx) => {
    ctx.json(200, {message: "hello world"})
}

export default handler;
```

To serve:
```bash
bun run dev
```

To test the POST route:
```bash
curl -X POST localhost:8080
```

## Features

### Manual Routing
A Hello, World application:

```ts
let app = new Xerus();

const TitleText = (props: {title: string, text: string}): JSX.Element => {
    return (
        <div>
            <h1>{title}</h1>
            <p>{text}</p>
        </div>
    )
}

app.get('/', async (ctx: XerusCtx) => {
    ctx.jsx(200, <TitleText title='Page' text='home'/>)
})

await app.run(8080)
```

### Middleware
Maybe we want all routes to say hi? boom💥:

```ts
let app = new Xerus();

app.global(async (ctx: XerusCtx) => {
    console.log('hi')
})

app.get('/', async (ctx: XerusCtx) => {
    ctx.html(200, "<h1>Hello, World!</h1>")
})

await app.run(8080)
```

### Static Files / Favicon
To serve static files from `./static` and favicon from `./favicon.ico`:

```ts
const app = new Xerus()

app.global(XerusMw.serveStaticFiles)
app.global(XerusMw.serveFavicon)
```

### Routers
What if you want to apply a middleware to only *certain* routes? That's what `Router` is for.

Spawn a `Router`:
```ts
const app = new Xerus()
let apiRouter = app.spawnRouter('/api')

type User = {
    name: string
}

apiRouter.use(async (ctx: XerusCtx) => {
    console.log('stash data inside ctx.data within middleware')
    ctx.data.users = [
        { name: "Alice" },
        { name: "Bob" }
    ]
})

apiRouter.get("/users", async (ctx: XerusCtx) => {
    console.log('use ctx.data.users within handler')
    ctx.json(200, ctx.data.users as User[])
})

await app.run(8080)
```

Test using:
```bash
curl -X POST localhost:8080/api/users
```

### App-Level Middleware
You may find yourself in a situation where you need a middleware to only apply on routes at the app level, but not on *ALL* routes. In this case, you can use `app.use` instead of `app.global`:

```tsx
const app = new Xerus()
const adminRoute = app.spawnRoute('/')

app.use(async (ctx: XerusCtx) => {
    console.log('I only print on routes added to `app`')
})

app.get('/', async (ctx: XerusCtx) => {
    ctx.html(200, "<h1>Hello, World!</h1>")
})

adminRouter.get("/", async (ctx: XerusCtx) => {
    ctx.html(200, "<h1>Hello, Admin!</h1>")
})

await app.run(8080)
```

### Dynamic Paths
Dynamic paths should be easy:

```ts
const app = new Xerus()

const SomeComponent = (props: {
    text: string
}) => {
    return (
        <>  
            <h1>{props.text}</h1>
        </>
    )
}

app.get("/users/:id", async (ctx: XerusCtx) => {
    let id = ctx.pathPart(1)
	ctx.jsx(200, <SomeComponent text={id} />)
})

await app.run(8080)
```

`ctx.pathPart` enables you to access pieces of the path as if they were parts of an array.

### Query Parameters
Query params are a breeze:


```ts
const app = new Xerus()

const SomeComponent = (props: {
    text: string
}) => {
    return (
        <>  
            <h1>{props.text}</h1>
        </>
    )
}

app.get("/", async (ctx: XerusCtx) => {
    let someParam = ctx.pathParam('someParam') // returns "" if no param exists
	ctx.jsx(200, <SomeComponent text="Home" />)
})

await app.run(8080)
```
