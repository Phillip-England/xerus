import { HandlerFile, Router, type HandlerFunc, type Xerus } from "./export";
import { readdir } from 'node:fs/promises';
import { Dirent } from 'node:fs';
import { File } from "./File";

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
        this.routerFileNames = ['+handler.tsx', '+handler.ts']
    }

    async mount(dirname: string) {
        const systemFiles: Dirent[] = await readdir(dirname, {
            withFileTypes: true,
            recursive: true,
        });
        for (const file of systemFiles) {
            if (file.isFile()) {
                if (this.handlerFileNames.includes(file.name)) {
                    this.handlerFiles.push(new File(file, dirname));
                }
                if (this.routerFileNames.includes(file.name)) {
                    this.routerFiles.push(new File(file, dirname));
                }
            }
        }
        await this.initHandlers();
    }

    async initHandlers() {
        for (const h of this.handlerFiles) {
            if (h.relativePath == "/+handler.tsx" || h.relativePath == "/+handler.ts") {
                let handlerModule = await import(h.absolutePath);
                if (!handlerModule) {
                    continue;
                }
                let handler: HandlerFile = handlerModule.default;
                this.hookHandlersToRouters(this.app, handler, h);
            }
        }
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
                    this.hookHandlersToRouters(router, handler, h);
                    return
                }
                counter++;
            } while (counter < this.routerFiles.length);
            this.hookHandlersToRouters(this.app, handler, h);
        }
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

    async hookHandlersToRouters(router: Router | Xerus, handler: HandlerFile, file: File) {
        const registerRoute = (method: string, path: string, handlerFunc: HandlerFunc) => {
            try {
                switch (method) {
                    case 'GET':
                        router.get(path, handlerFunc);
                        break;
                    case 'POST':
                        router.post(path, handlerFunc);
                        break;
                    case 'PATCH':
                        router.patch(path, handlerFunc);
                        break;
                    case 'DELETE':
                        router.delete(path, handlerFunc);
                        break;
                    case 'UPDATE':
                        router.update(path, handlerFunc);
                        break;
                    case 'PUT':
                        router.put(path, handlerFunc);
                        break;
                    case 'OPTION':
                        router.option(path, handlerFunc);
                        break;
                }
            } catch (error: any) {
                // 405 error is handled by the router
                // just skip
            }
        };
        console.log(file)
        if (handler.get) {
            registerRoute('GET', file.endpointPath, handler.get);
        }
        if (handler.post) {
            registerRoute('POST', file.endpointPath, handler.post);
        }
        if (handler.put) {
            registerRoute('PUT', file.endpointPath, handler.put);
        }
        if (handler.delete) {
            registerRoute('DELETE', file.endpointPath, handler.delete);
        }
        if (handler.patch) {
            registerRoute('PATCH', file.endpointPath, handler.patch);
        }
        if (handler.options) {
            registerRoute('OPTION', file.endpointPath, handler.options);
        }
        if (handler.update) {
            registerRoute('UPDATE', file.endpointPath, handler.update);
        }
    }
}

