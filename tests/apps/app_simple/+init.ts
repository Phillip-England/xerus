import { Xerus, XerusCtx, XerusMw } from "../../../src/export"


export const init = async (app: Xerus) => {

    app.use(async (ctx: XerusCtx) => {
        ctx.store('somekey', '0')
    })

    app.use(XerusMw.serveStaticFiles)

}