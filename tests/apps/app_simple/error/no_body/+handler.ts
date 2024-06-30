import { Handler, HandlerExport, XerusCtx } from "../../../../../src/export"
import { ERR_DBG } from "../../../../../src/XerusErr"

export const handler = new HandlerExport()


handler.get = new Handler(async (ctx: XerusCtx) => {
})
