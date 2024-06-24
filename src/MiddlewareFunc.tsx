import type { XerusCtx } from "./XerusCtx";

export type MiddlewareFunc = (ctx: XerusCtx) => Promise<void>
