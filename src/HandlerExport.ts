import type { Handler, LoadFunc, MiddlewareFunc } from "./export";

export class HandlerExport {
    load: LoadFunc
    get: Handler | null = null;
    post: Handler | null = null;
    put: Handler | null = null;
    delete: Handler | null = null;
    patch: Handler | null = null;
    option: Handler | null = null;
    update: Handler | null = null;

    constructor() {
        this.load = async () => null;
        this.get = null;
        this.post = null;
        this.put = null;
        this.delete = null;
        this.patch = null;
        this.option = null;
        this.update = null;
    }

}
