import { Xerus } from "../../src/Xerus";
import { XerusCtx } from "../../src/XerusCtx";


export const init = async (app: Xerus) => {

    app.use(async (ctx: XerusCtx) => {
        ctx.store('somekey', 'PATH: GLOBAL MIDDLEWARE')
    })

}