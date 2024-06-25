import type { HandlerFunc } from "./export";

export class Route {
    prefix: string;
    path: string;
    method: string;
    handler: HandlerFunc;

    constructor(prefix: string, path: string, method: string, handler: HandlerFunc) {
        this.prefix = prefix;
        this.path = path;
        this.method = method;
        this.handler = handler;
    }
}