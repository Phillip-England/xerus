import type { Handler } from "./export";

export class Route {
    path: string;
    method: string;
    handler: Handler;

    constructor(path: string, method: string, handler: Handler) {
        this.path = path;
        this.method = method;
        this.handler = handler;
    }
}