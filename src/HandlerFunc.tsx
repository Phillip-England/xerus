import type { RequestCtx } from "./RequestCtx";


export type HandlerFunc = (ctx: RequestCtx) => Promise<void>
