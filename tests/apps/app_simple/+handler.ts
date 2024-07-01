import { Handler, HandlerExport, XerusCtx } from "../../../src/export"

export const handler = new HandlerExport()

handler.get = new Handler(async (ctx: XerusCtx) => {
    ctx.text(200, ctx.get('somekey'))
}, async (ctx: XerusCtx) => {
    ctx.store('somekey', `${ctx.get('somekey')}2`)
})