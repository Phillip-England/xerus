import type { Handler, HandlerFile } from "./export";

export class Route {
    handlerFile: HandlerFile;
    method: string;
    handler: Handler;

    constructor(handlerFile: HandlerFile, method: string, handler: Handler) {
        this.handlerFile = handlerFile;
        this.method = method;
        this.handler = handler;
    }
}