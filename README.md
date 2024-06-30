# Xerus
Xerus is a meta-framework for the Bun runtime. Xerus is centered on a file-based routing system, along with a few reactive primitives for client-side interactions.

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
    "dev": "bun --hot run ./index.ts",
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
        ctx.store('somekey', 'Hello')
    })
}
```

### Creating Handlers
Place a handler in the root of your application for the `/` path.

`./app/+handler.ts`
```ts
export const handler = new HandlerExport()

handler.use(async (ctx: XerusCtx) => {
    let hello = ctx.get('somekey')
    console.log(hello) // 'Hello'
    ctx.store('somekey', `${hello}, World!`)
})

const getHandlerMiddleware = async (ctx: XerusCtx) => {
    ctx.store('methodkey', 'GET')
}

const postHandlerMiddleware = async (ctx: XerusCtx) => {
    ctx.store('methodkey', 'POST')
}

handler.get = new Handler(async (ctx: XerusCtx) => {
    ctx.text(200, `${ctx.get('methodkey')} ${gtx.get('somekey')}`)
}, ...handler.mw(getHandlerMiddleware))

handler.post = new Handler(async (ctx: XerusCtx) => {
    ctx.json(200, {'message': `${ctx.get('methodkey')} ${ctx.get('somekey')}`})
}, ...handler.mw(postHandlerMiddleware))
```

### Serving
```bash
bun run dev
```

### Testing

Test the GET route using:
```bash
curl localhost:8080
```

You should see:
```bash
GET Hello, World!
```

Test the POST route using:
```bash
curl -X POST lostlhost:8080
```

You should see:
```bash
POST {'message': 'POST Hello, World!'}
```