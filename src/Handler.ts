import type { MiddlewareFunc } from "./MiddlewareFunc";
import type { XerusCtx } from "./XerusCtx";


export type LoadFunc = () => Promise<any | null>
export type ClientFunc = () => Promise<any | null>
export type HandlerFunc = (ctx: XerusCtx, loadFunc?: LoadFunc) => Promise<void>

export class Handler {
    middleware: MiddlewareFunc[] = [];
    handlerFunc: HandlerFunc;

    constructor(handlerFunc: HandlerFunc, ...middleware: MiddlewareFunc[]) {
        this.handlerFunc = handlerFunc;
        this.middleware = middleware;
    }

}