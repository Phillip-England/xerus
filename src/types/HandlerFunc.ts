import type { AppContext } from "./AppContext";


export type HandlerFunc = (ctx: AppContext) => Promise<void>
