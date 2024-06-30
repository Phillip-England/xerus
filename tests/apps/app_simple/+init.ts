import { Xerus, XerusCtx } from "../../../src/export"


export const init = async (app: Xerus) => {

    app.use(async (ctx: XerusCtx) => {
        ctx.store('somekey', 'PATH: GLOBAL MIDDLEWARE')
    })

}