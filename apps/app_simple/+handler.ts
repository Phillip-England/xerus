import { HandlerExport } from "../../src/HandlerExport"
import { Handler } from "../../src/HandlerFunc"
import { XerusCtx } from "../../src/XerusCtx"

export const handler = new HandlerExport()

handler.use(async (ctx: XerusCtx) => {
    ctx.store('somekey', `${ctx.get('somekey')} middleware: /`)
})

handler.get = new Handler(async (ctx: XerusCtx) => {
    ctx.store('somekey', `${ctx.get('somekey')} GET: /`)
    ctx.text(200, ctx.get('somekey'))
}, ...handler.mw())