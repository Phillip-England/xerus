import { Handler, HandlerExport, XerusCtx } from "../../../../src/export"

export const handler = new HandlerExport()

handler.get = new Handler(async (ctx: XerusCtx) => {
    ctx.html(200, `<h1>Hello, World!</h1>`)
})

handler.post = new Handler(async (ctx: XerusCtx) => {
    ctx.json(200, {"message":"hello world"})
})