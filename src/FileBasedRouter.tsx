import { Router, type HandlerFunc, type PluginFunc, type Xerus } from "./export";
import { readdir } from 'node:fs/promises';
import { Dirent } from 'node:fs';
import { File } from "./File";

export class FileBasedRouter {
    app: Xerus;
    handlerFiles: File[];
    routerFiles: File[];

    constructor(app: Xerus) {
        this.app = app;
        this.handlerFiles = [];
        this.routerFiles = [];
    }

    async mount(dirname: string) {
        const systemFiles: Dirent[] = await readdir(dirname, {
            withFileTypes: true,
            recursive: true,
        });
        for (const file of systemFiles) {
            if (file.isFile()) {
                if (file.name === '+handler.tsx') {
                    this.handlerFiles.push(new File(file));
                }
                if (file.name === '+router.tsx') {
                    this.routerFiles.push(new File(file));
                }
            }
        }
        await this.initHandlers();
    }

    async initHandlers() {
        for (const r of this.routerFiles) {
            for (const h of this.handlerFiles) {
                let routerModule = await import(r.absolutePath);
                let handlerModule = await import(h.absolutePath);
                if (!routerModule || !handlerModule) {
                    continue;
                }
                let router: Router = routerModule.default;
                let handler: HandlerFile = handlerModule.default;
                if (!handler || !router) {
                    continue;
                }
                let routerPrefix = router.prefix;
                let handlerContainsPrefix = h.relativePath.startsWith(routerPrefix);
                if (handlerContainsPrefix) {
                    this.hookHandlersToRouters(router, handler);
                } else {
                    this.hookHandlersToRouters(this.app, handler);
                }
            }
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

    async hookHandlersToRouters(router: Router | Xerus, handler: HandlerFile) {
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
                console.error(error.message);
            }
        };

        if (handler.get) {
            registerRoute('GET', '/', handler.get);
        }
        if (handler.post) {
            registerRoute('POST', '/', handler.post);
        }
        if (handler.put) {
            registerRoute('PUT', '/', handler.put);
        }
        if (handler.delete) {
            registerRoute('DELETE', '/', handler.delete);
        }
        if (handler.patch) {
            registerRoute('PATCH', '/', handler.patch);
        }
        if (handler.options) {
            registerRoute('OPTION', '/', handler.options);
        }
        if (handler.update) {
            registerRoute('UPDATE', '/', handler.update);
        }
    }
}

export class HandlerFile {
    get: HandlerFunc | null = null;
    post: HandlerFunc | null = null;
    put: HandlerFunc | null = null;
    delete: HandlerFunc | null = null;
    patch: HandlerFunc | null = null;
    options: HandlerFunc | null = null;
    update: HandlerFunc | null = null;

    constructor() {
        this.get = null;
        this.post = null;
        this.put = null;
        this.delete = null;
        this.patch = null;
        this.options = null;
        this.update = null;
    }
}
