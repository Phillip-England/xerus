import type { HandlerFunc } from "./export";

export class Handler {
    get: HandlerFunc | null = null;
    post: HandlerFunc | null = null;
    put: HandlerFunc | null = null;
    delete: HandlerFunc | null = null;
    patch: HandlerFunc | null = null;
    option: HandlerFunc | null = null;
    update: HandlerFunc | null = null;

    constructor() {
        this.get = null;
        this.post = null;
        this.put = null;
        this.delete = null;
        this.patch = null;
        this.option = null;
        this.update = null;
    }
}
