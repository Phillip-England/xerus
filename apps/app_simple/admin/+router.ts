import { Router } from "../../../src/Router"
import { RouterExport } from "../../../src/RouterExport"
import { Xerus } from "../../../src/Xerus"
import { XerusCtx } from "../../../src/XerusCtx"


export const router = new RouterExport(async (app: Xerus, router: Router) => {
    
    router.use(async (ctx: XerusCtx) => {
        ctx.store('somekey', 'somevalue')
    })

})
