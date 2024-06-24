import type { XerusCtx } from "./XerusCtx";


export type HandlerFunc = (ctx: XerusCtx) => Promise<void>
