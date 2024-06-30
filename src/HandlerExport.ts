import type { Handler, MiddlewareFunc } from "./export";

export class HandlerExport {
    middleware: MiddlewareFunc[] = [];
    get: Handler | null = null;
    post: Handler | null = null;
    put: Handler | null = null;
    delete: Handler | null = null;
    patch: Handler | null = null;
    option: Handler | null = null;
    update: Handler | null = null;

    constructor() {
        this.get = null;
        this.post = null;
        this.put = null;
        this.delete = null;
        this.patch = null;
        this.option = null;
        this.update = null;
    }

    use(middlewareFunc: MiddlewareFunc) {
        this.middleware.push(middlewareFunc);
    }

    mw(...middleware: MiddlewareFunc[]): MiddlewareFunc[] {
        return [...this.middleware, ...middleware]
    }

}
