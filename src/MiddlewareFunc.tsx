import type { RequestCtx } from "./RequestCtx";

export type MiddlewareFunc = (ctx: RequestCtx) => Promise<void>
