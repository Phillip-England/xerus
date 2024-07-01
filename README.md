# Xerus
Web Apps with File-Based Routing and Reactive Primitives.

## Installation
Bun is a relatively new runtime. This iteration of Xerus was made with Bun 1.1.17. Please run `bun upgrade` if you are not up-to-date.

```bash
mkdir mkdir myapp
cd myapp
bun init
bun install xerus
```

## Hot Reload
Go ahead and update the `scripts` section of your `package.json` for hot reload:
```json
  "scripts": {
    "dev": "bun --hot run ./index.ts"
  }
```

## Quickstart

### Entrypoint
Responsible for basic application initialization. Gives you the opporunity to do any work you would like to complete prior to the `FileBasedRouter` being initialized.

`./index.ts`
```ts
const app = new Xerus()
app.use(XerusMw.serveStaticFiles)
const router = new FileBasedRouter(app)
await router.mount('./app')
await app.run(8080)
```

### App Initilization
Allows you the chance to set up global middleware.

`./app/+init.ts`
```ts
export const init = async (app: Xerus) => {
    app.use(async (ctx: XerusCtx) => {
        ctx.store('somekey', 'Hello, World!')
    })
}
```

### Creating Handlers
Place a few handlers in your app:

`./app/+handler.ts`
```ts
export const handler = new HandlerExport()

handler.get = new Handler(async (ctx: XerusCtx) => {
    ctx.text(200, ctx.get('somekey'))
})

handler.post = new Handler(async (ctx: XerusCtx) => {
    ctx.json(200, {'message': ctx.get('somekey')})
})
```

`./app/users/:id/+handler.ts`
```ts
export const handler = new HandlerExport()

handler.get = new Handler(async (ctx: XerusCtx) => {
    ctx.text(200, ctx.pathPart(2))
})
```

`./app/param/+handler.ts`
```ts
export const handler = new HandlerExport()

handler.get = new Handler(async (ctx: XerusCtx) => {
    ctx.text(200, ctx.param('name'))
})
```

### Serving
```bash
bun run dev
```

### Testing
```bash
curl localhost:8080/ ## Hello, World!
curl -X POST localhost:8080 ## {"message": "Hello, World!"}
curl localhost:8080/users/123 ## 123
curl localhost:8080/param?name=bob ## bob
```

## Middleware
Middleware can be applied to your handlers in 3 different ways, each with their own purpose and intended use-case. They are applied in the follwing order:

1. +init.ts middleware (global)
2. +middleware.ts middleware (group)
3. +handler.ts middleware (local)

### +init.ts middleware
The `init.ts` file is intended to apply **global** middleware. That is, middleware that runs on every handler in the application.

The following will make every request say hi:
`./app/+init.ts`
```ts
export const init = async (app: Xerus) => {
    app.use(async (ctx: XerusCtx) => {
        console.log('hi!')
    })
}
```

### +middleware.ts middleware
`+handler.ts` files will climb the file tree in search of the nearest parent `+middleware.ts` file. When the closest `+middleware.ts` file is found, it's middleware will be exported and applied to the `+handler.ts` file.

This enables us to apply middleware to groups of handlers all beneath a particular branch of our application.

**Warning**, each `+handler.ts` can only have one `+middleware.ts` file associated with it at a time. Middleware does not cascade downwards to all child `+handler.ts` files. This may be the expected behaviour.

`./app/admin/+middleware.ts`
```ts
export const middleware = new MiddlewareExport(async (ctx) => {
    ctx.store('somekey', `Hello, Middleware!`)
})
```

`./app/admin/+handler.ts`
```ts
export const handler = new HandlerExport()

handler.get = new Handler(async (ctx: XerusCtx) => {
    console.log(ctx.get('somekey')) // Hello, Middleware! 
    // ...
})
```

### +handler.ts middleware
In the event a single handler needs to apply a few middlewares at the local level, do the following:

`./app/+handler.ts`
```ts
export const handler = new HandlerExport()

const middleware1 = async (ctx: XerusCtx) => {
    ctx.store('somekey', 'middleware1')
}

const middleware1 = async (ctx: XerusCtx) => {
    console.log(ctx.get('somekey')) // middleware1
    ctx.store('somekey', 'middleware2')
}

handler.get = new Handler(async (ctx: XerusCtx) => {
    console.log(ctx.get('somekey')) // middleware2
    // ...
}, middleware1, middleware2)
```


