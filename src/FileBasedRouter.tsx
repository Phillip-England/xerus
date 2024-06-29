import { HandlerFile, Router, Xerus, type HandlerFunc } from "./export";
import { readdir } from 'node:fs/promises';
import { Dirent } from 'node:fs';
import { File } from "./File";
import { XerusTrace } from "./XerusTrace";
import { ERR_NO_ROOT_HANDLER_FILE } from "./XerusErr";

export class FileBasedRouter {
    app: Xerus;
    handlerFiles: File[];
    routerFiles: File[];
    handlerFileNames: string[];
    routerFileNames: string[];

    constructor(app: Xerus) {
        this.app = app;
        this.handlerFiles = [];
        this.routerFiles = [];
        this.handlerFileNames = ['+handler.tsx', '+handler.ts']
        this.routerFileNames = ['+router.tsx', '+router.ts']
    }

    async mount(dirname: string) {
        await this.extractAppFiles(dirname)
        await this.hookRootHandler();
        await this.initHandlers();
        await this.mountRouters(dirname)
    }

    async extractAppFiles(dirname: string) {
        const systemFiles: Dirent[] = await readdir(dirname, {
            withFileTypes: true,
            recursive: true,
        });
        for (let i = 0; i < systemFiles.length; i++) {
            let file = systemFiles[i]
            if (file.isFile()) {
                if (this.handlerFileNames.includes(file.name)) {
                    this.handlerFiles.push(new File(file, dirname));
                }
                if (this.routerFileNames.includes(file.name)) {
                    this.routerFiles.push(new File(file, dirname));
                }
            }
        }
        let foundRootHandler = false;
        for (const h of this.handlerFiles) {
            if (this.handlerFileNames.includes(h.relativePath)) {
                foundRootHandler = true;
            }
        }
        if (!foundRootHandler) {
            throw new Error(ERR_NO_ROOT_HANDLER_FILE(dirname));
        }
    }

    async mountRouters(dirname: string) {
        for (const r of this.routerFiles) {
            let routerModule = await import(r.absolutePath);
            if (!routerModule) {
                continue;
            }
            let router: Router = routerModule.default;
            if (!router) {
                continue;
            }
            this.app.mountRouters(router);
        } 
    }

    async hookRootHandler() {
        for (const h of this.handlerFiles) {
            if (h.relativePath == "/+handler.tsx" || h.relativePath == "/+handler.ts") {
                let handlerModule = await import(h.absolutePath);
                if (!handlerModule) {
                    continue;
                }
                let handler: HandlerFile = handlerModule.default;
                this.hookHandlersToApp(this.app, handler, h);
            }
        }
    }

    async initHandlers() {

        for (const h of this.handlerFiles) {
            let handlerModule = await import(h.absolutePath);
            if (!handlerModule) {
                continue;
            }
            let handler: HandlerFile = handlerModule.default;
            if (!handler) {
                continue;
            }
            if (h.relativePath == "/+handler.tsx" || h.relativePath == "/+handler.ts") {
                continue;
            }

            let counter = 0;
            do {
                if (counter >= this.routerFiles.length) {
                    break;
                }
                let r = this.routerFiles[counter]
                let routerModule = await import(r.absolutePath);
                if (!routerModule) {
                    continue;
                }
                let router: Router = routerModule.default;
                if (!router) {
                    continue;
                }
                let routerPrefix = router.prefix;
                let handlerContainsPrefix = h.relativePath.startsWith(routerPrefix);
                if (handlerContainsPrefix) {
                    this.hookHandlersToRouter(router, handler, h);
                    return
                }
                counter++;
            } while (counter < this.routerFiles.length);
            this.hookHandlersToApp(this.app, handler, h);
        }
    }

    async hookHandlersToApp(app: Xerus, handler: HandlerFile, file: File) {
        if (handler.get) {
            app.get(file.endpointPath, handler.get);
        }
        if (handler.post) {
            app.post(file.endpointPath, handler.post);
        }
        if (handler.put) {
            app.put(file.endpointPath, handler.put);
        }
        if (handler.delete) {
            app.delete(file.endpointPath, handler.delete);
        }
        if (handler.patch) {
            app.patch(file.endpointPath, handler.patch);
        }
        if (handler.option) {
            app.option(file.endpointPath, handler.option);
        }
        if (handler.update) {
            app.update(file.endpointPath, handler.update);
        }
    }

    async hookHandlersToRouter(router: Router, handler: HandlerFile, file: File) {
        if (handler.get) {
            router.get(file.endpointPath, handler.get);
        }
        if (handler.post) {
            router.post(file.endpointPath, handler.post);
        }
        if (handler.put) {
            router.put(file.endpointPath, handler.put);
        }
        if (handler.delete) {
            router.delete(file.endpointPath, handler.delete);
        }
        if (handler.patch) {
            router.patch(file.endpointPath, handler.patch);
        }
        if (handler.option) {
            router.option(file.endpointPath, handler.option);
        }
        if (handler.update) {
            router.update(file.endpointPath, handler.update);
        }
    }


}

