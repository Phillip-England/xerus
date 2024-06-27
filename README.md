# Xerus

An Express-like framework for Bun.

## Installation

With bun 1.1.12 or greater installed, run:
```bash
mkdir <app-name>
cd <app-name>
bun init
bun install xerus
```

And replace your `index.ts` with an `index.tsx`:
```bash
mv index.ts index.tsx
```

Then throw this in the `scripts` section of your `package.json` for quick hot-reload:
```json
"scripts": {
    "dev": "bun --hot run ./index.tsx" // don't forget, we are using .tsx, not .ts
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

app.run(8080)
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

To serve on `localhost:8080`:
```bash
bun run dev
```


## Features

### Simple Routing
A simple Hello, World application:

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

app.global(async (ctx: XerusCtx) => {
    console.log('hi')
})

app.get('/', async (ctx: XerusCtx) => {
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

apiRouter.use(async (ctx: XerusCtx) => {
    console.log('I only print on routes prefixed with "/api"')
})

apiRouter.get("/users", async (ctx: XerusCtx) => {
    const users: User[] = [
        { name: "Alice" },
        { name: "Bob" }
    ]
    ctx.json(200, users)
})
```

at `localhost:8080/api/users` you'll see:
```json
[{"name":"Alice"},{"name":"Bob"}]
```

Take note, we do:
```ts
apiRouter.get('/users' ....
```
instead of:
```ts
apiRouter.get('/api/users' ......
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
	ctx.html(200, renderToString(<SomeComponent text={id} />))
})

app.run(8080)
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
	ctx.html(200, renderToString(<SomeComponent text="Home" />))
})

app.run(8080)
```
