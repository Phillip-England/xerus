import type { AppContext } from "./RequestCtx";


export type HandlerFunc = (ctx: AppContext) => Promise<void>
