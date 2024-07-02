import { Handler } from "../../../../src/export"
import { HandlerExport } from "../../../../src/HandlerExport"
import { XerusCtx } from "../../../../src/XerusCtx"

export const handler = new HandlerExport()


handler.get = new Handler(async (ctx: XerusCtx) => {
    let param = ctx.query('some_value')
    ctx.text(200, `${ctx.get('somekey')}${param}`)
})
