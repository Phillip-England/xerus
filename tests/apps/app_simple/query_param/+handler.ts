import { HandlerExport } from "../../../../src/HandlerExport"
import { Handler } from "../../../../src/HandlerFunc"
import { XerusCtx } from "../../../../src/XerusCtx"

export const handler = new HandlerExport()


handler.get = new Handler(async (ctx: XerusCtx) => {
    let param = ctx.query('some_value')
    ctx.text(200, `${param}`)
})
