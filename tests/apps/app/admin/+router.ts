import { Router } from "../../../src/Router";
import { XerusCtx } from "../../../src/XerusCtx";
import { ERR_GENERIC } from "../../../src/XerusErr";

const router = new Router("/admin");

router.use(async (ctx: XerusCtx) => {
    ctx.store("admin-secret-key", ERR_GENERIC)
})

export default router;