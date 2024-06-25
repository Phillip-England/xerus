import { Router, XerusCtx } from "../../src/export"

export const router = new Router("/admin")

router.use(async (ctx: XerusCtx) => {
    console.log('admin-only middleware')
})

export default router