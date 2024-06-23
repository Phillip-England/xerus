import type { AppContext } from "./RequestCtx";


export type MiddlewareFunc = (ctx: AppContext) => Promise<void>
