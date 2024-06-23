import type { RequestCtx } from "./XerusCtx";


export type HandlerFunc = (ctx: RequestCtx) => Promise<void>
