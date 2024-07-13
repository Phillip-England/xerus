import type { HandlerExport } from "./HandlerExport";
import type { Xerus } from "./Xerus";
import type { File } from "./File";
import type { MiddlewareFile } from "./MiddlewareFile";

export class HandlerFile {
    file: File
    middlewareFile: MiddlewareFile | null

    constructor(file: File) {
        this.file = file
        this.middlewareFile = null
    }

    async getHandlerExport(): Promise<HandlerExport> {
        return await this.file.getExport('handler') as HandlerExport;
    }

    async setMiddlewareFile(middlewareFile: MiddlewareFile) {
        this.middlewareFile = middlewareFile
    }

    async hookToApp(app: Xerus) {
        let handler = await this.getHandlerExport();
        if (handler.get) {
            app.router.get(this, handler.get);
        }
        if (handler.post) {
            app.router.post(this, handler.post);
        }
        if (handler.put) {
            app.router.put(this, handler.put);
        }
        if (handler.delete) {
            app.router.delete(this, handler.delete);
        }
        if (handler.patch) {
            app.router.patch(this, handler.patch);
        }
        if (handler.option) {
            app.router.option(this, handler.option);
        }
        if (handler.update) {
            app.router.update(this, handler.update);
        }
    }

}