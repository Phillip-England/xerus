import type { AppContext } from "./AppContext";


export type MiddlewareFunc = (ctx: AppContext) => Promise<void>
