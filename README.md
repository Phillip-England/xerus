# Xerus

An Express-like framework for Bun. Quick and easy to use.

## Installation

Create a new bun application:
```bash
mkdir my-app;
cd my-app;
bun init;
```
Install Xerus
```bash
bun create phillip-england/xerus <app-name>
```

## Quickstart

TODO: need to include a part here of how to do imports

Create a new Xerus app:
```ts
const app: Xerus = new Xerus()
```

Associate a url path with a `HandlerFunc` using `Xerus`:
```ts
app.get('/', async(ctx: AppContext) => {
    setBody(ctx, '<h1>Hello, World!</h1>')
})
```

A `MiddlewareFunc` registered on `Xerus` will apply to all routes:
```ts
app.use(async (ctx: AppContext) => {
    setHeader(ctx, 'Context-Type', 'text/html') // all routes will return html
})
```

A `Router` can be spawned:
```ts
let adminRouter = app.spawnRouter('/admin')
```

Associate a url path with a `HandlerFunc` using a `Router`:
```ts
adminRouter('/', async(ctx: AppContext) => {
    setBody(ctx, '<h1>Hello, Admin!</h1>') // visit "/admin" to view!
})
```

A `MiddlewareFunc` registered on a `Router` will only apply it's own routes:
```ts
adminRouter.use(async (ctx: AppContext) => {
    console.log('I only print on routes registered with the "adminRouter"')
})
```

Don't forget to mount the `Router`:
```ts
app.mountRouters(adminRouter)
```

Serve the app:
```ts
app.run(8080)
```
