import type { Handler, MiddlewareFunc } from "./export";

export class MiddlewareExport {
    middleware: MiddlewareFunc[] = [];

    constructor(...middleware: MiddlewareFunc[]) {
        this.middleware = middleware;
    }

}
