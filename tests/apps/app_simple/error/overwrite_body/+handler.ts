import { Handler, HandlerExport, XerusCtx } from "../../../../../src/export"
import { ERR_DBG } from "../../../../../src/XerusErr"

export const handler = new HandlerExport()


handler.get = new Handler(async (ctx: XerusCtx) => {
    ctx.text(200, 'setting the body once!')
    ctx.text(200, `<h1>on no! setting it again!</h1>`)
})
