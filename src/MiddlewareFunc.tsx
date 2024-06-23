import type { RequestCtx } from "./XerusCtx";

export type MiddlewareFunc = (ctx: RequestCtx) => Promise<void>
