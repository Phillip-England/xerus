import type { MiddlewareFunc } from "./MiddlewareFunc";
import type { XerusCtx } from "./XerusCtx";


export type HandlerFunc = (ctx: XerusCtx) => Promise<void>

export class Handler {
    middleware: MiddlewareFunc[] = [];
    handlerFunc: HandlerFunc | null = null;

    constructor(handlerFunc: HandlerFunc, ...middleware: MiddlewareFunc[]) {
        this.handlerFunc = handlerFunc;
        this.middleware = middleware;
    }
}