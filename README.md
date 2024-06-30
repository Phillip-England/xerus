# Xerus
Xerus is a meta-framework for the Bun runtime. Xerus is centered on a file-based routing system, along with a few reactive primitives for client-side interactions.

## Quickstart

### Entrypoint
`./index.ts`
```ts
const app = new Xerus()
app.use(XerusMw.serveStaticFiles)
const router = new FileBasedRouters(app)
await router.mount('./app')
await app.run(8080)
```

### App Initilization
`./app/+init.ts`
```ts
export const init = async (app: Xerus) => {
    app.use(async (ctx: XerusCtx) => {
        ctx.store('somekey', 'Hello')
    })
}
```

### Handler for "/"
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
    ctx.text(200, `${ctx.get('methodkey')} ${gtx.get('somekey')}`) // `GET Hello, World!`
}, ...handler.mw())

handler.post = new Handler(async (ctx: XerusCtx) => {
    ctx.json(200, {'message': `${ctx.get('methodkey')} ${ctx.get('somekey')}`}) // {'message': 'POST Hello, World!'}
}, ...handler.mw())

```