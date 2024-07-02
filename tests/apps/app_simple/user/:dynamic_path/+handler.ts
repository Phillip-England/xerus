import { Handler } from "../../../../../src/Handler"
import { HandlerExport } from "../../../../../src/HandlerExport"
import { XerusCtx } from "../../../../../src/XerusCtx"

export const handler = new HandlerExport()


handler.get = new Handler(async (ctx: XerusCtx) => {
    let part = ctx.pathPart(1)
    ctx.text(200, `${part}`)
})
