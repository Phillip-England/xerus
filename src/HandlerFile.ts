import type { HandlerExport } from "./HandlerExport";
import type { Xerus } from "./Xerus";
import type { File } from "./File";

export class HandlerFile {
    file: File

    constructor(file: File) {
        this.file = file
    }

    async getHandlerExport(): Promise<HandlerExport> {
        return await this.file.getExport('handler') as HandlerExport;
    }

    async hookToApp(app: Xerus) {
        let handler = await this.getHandlerExport();
        if (handler.get) {
            app.router.get(this.file.endpointPath, handler.get);
        }
        if (handler.post) {
            app.router.post(this.file.endpointPath, handler.post);
        }
        if (handler.put) {
            app.router.put(this.file.endpointPath, handler.put);
        }
        if (handler.delete) {
            app.router.delete(this.file.endpointPath, handler.delete);
        }
        if (handler.patch) {
            app.router.patch(this.file.endpointPath, handler.patch);
        }
        if (handler.option) {
            app.router.option(this.file.endpointPath, handler.option);
        }
        if (handler.update) {
            app.router.update(this.file.endpointPath, handler.update);
        }
    }

}