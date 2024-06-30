import { Router } from "../../../../../src/Router"
import { RouterExport } from "../../../../../src/RouterExport"
import { Xerus } from "../../../../../src/Xerus"
import { XerusCtx } from "../../../../../src/XerusCtx"


export const router = new RouterExport(true, async (app: Xerus, router: Router) => {
    
    router.use(async (ctx: XerusCtx) => {
        ctx.store('somekey', '/admin/noinherit/doinherit/+router.ts')
    })

})
