import { Handler, HandlerFile, Router, Xerus, type HandlerFunc } from "./export";
import { readdir } from 'node:fs/promises';
import { Dirent } from 'node:fs';
import { File } from "./File";
import { XerusTrace } from "./XerusTrace";
import { ERR_NO_ROOT_HANDLER_FILE } from "./XerusErr";

export class FileBasedRouter {
    app: Xerus;
    handlerFiles: HandlerFile[];
    routerFileNames: string[];
    routerFiles: File[];
    handlerFileNames: string[];
    appInitFiles: File[];
    appInitFileNames: string[];
    goodFileNames: string[];
    errNoAppFile: Function;
    errAppDirNotFound: Function;
    errNoRootHandlerFile: Function;
    errUnknownAppFile: Function;
    errHandlerFileMissingHandlerModule: Function;
    errHandlerFileMissingHandlerClass: Function;

    constructor(app: Xerus) {
        this.app = app;
        this.handlerFiles = [];
        this.handlerFileNames = ['+handler.ts']
        this.routerFiles = [];
        this.routerFileNames = ['+router.ts']
        this.appInitFiles = [];
        this.appInitFileNames = ['+init.ts']
        this.goodFileNames = [...this.handlerFileNames, ...this.routerFileNames, ...this.appInitFileNames]
        this.errNoAppFile = (dirname: string) => `no +init.ts file found at: ${dirname}`;
        this.errAppDirNotFound = (dirname: string) => `app directory does not exist: ${dirname}`;
        this.errNoRootHandlerFile = (dirname: string) => `no +handler.ts file found at ${dirname}`;
        this.errUnknownAppFile = (fileName: string) => `unknown app file found: ${fileName}`;
        this.errHandlerFileMissingHandlerModule = (fileName: string) => `handler file missing handler module: ${fileName}`;
        this.errHandlerFileMissingHandlerClass = (fileName: string) => `handler file missing handler class: ${fileName}`;
        
    }

    async mount(dirname: string) {
        await this.registerFiles(await this.getFiles(dirname), dirname)
        await this.assertInitFileExists(dirname);
        await this.assertRootHandlerExists(dirname);
        await this.assertNoUnknownFiles(dirname);
        await this.initHandlers();
        await this.mountRouters(dirname)
    }

    async getFiles(dirname: string): Promise<Dirent[]> {
        let systemFiles: Dirent[];
        try {
            systemFiles = await readdir(dirname, {
                withFileTypes: true,
                recursive: true,
            });
        } catch(e: unknown) {
            throw new Error(this.errAppDirNotFound(dirname))
        }
        return systemFiles;
    }

    async registerFiles(files: Dirent[], dirname: string) {
        for (let i = 0; i < files.length; i++) {
            let file = files[i]
            if (file.isFile()) {
                if (this.handlerFileNames.includes(file.name)) {
                    this.handlerFiles.push(new HandlerFile(new File(file, dirname)));
                    continue
                }
                if (this.routerFileNames.includes(file.name)) {
                    this.routerFiles.push(new File(file, dirname));
                    continue
                }
                if (this.appInitFileNames.includes(file.name)) {
                    this.appInitFiles.push(new File(file, dirname));
                    continue
                }
            }
        }
    }

    async assertInitFileExists(dirname: string) {
        if (this.appInitFiles.length == 0) {
            throw new Error(this.errNoAppFile(dirname));
        }
    }

    async assertRootHandlerExists(dirname: string) {
        let foundRootHandler = false;
        for (const h of this.handlerFiles) {
            if (this.handlerFileNames.includes(h.file.details.name)) {
                foundRootHandler = true;
            }
        }
        if (!foundRootHandler) {
            throw new Error(this.errNoRootHandlerFile(dirname));
        }
    }

    async assertNoUnknownFiles(dirname: string) {
        let unknownFiles = this.handlerFiles.filter((file) => {
            return !this.goodFileNames.includes(file.file.details.name);
        });
        if (unknownFiles.length > 0) {
            throw new Error(this.errUnknownAppFile(unknownFiles[0].file.details.name));
        }
    }

    async getRootHandlerFile(): Promise<HandlerFile> {
        return this.handlerFiles[0] as HandlerFile;
    }

    async initHandlers() {
        for (const h of this.handlerFiles) {
            let handler: Handler = await h.getHandler();
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
                let handlerContainsPrefix = h.file.relativePath.startsWith(routerPrefix);
                if (handlerContainsPrefix) {
                    this.hookHandlersToRouter(router, handler, h);
                    return
                }
                counter++;
            } while (counter < this.routerFiles.length);
            this.hookHandlersToApp(this.app, handler, h);
        }
    }

    async hookHandlersToApp(app: Xerus, handler: Handler, hf: HandlerFile) {
        if (handler.get) {
            app.get(hf.file.endpointPath, handler.get);
        }
        if (handler.post) {
            app.post(hf.file.endpointPath, handler.post);
        }
        if (handler.put) {
            app.put(hf.file.endpointPath, handler.put);
        }
        if (handler.delete) {
            app.delete(hf.file.endpointPath, handler.delete);
        }
        if (handler.patch) {
            app.patch(hf.file.endpointPath, handler.patch);
        }
        if (handler.option) {
            app.option(hf.file.endpointPath, handler.option);
        }
        if (handler.update) {
            app.update(hf.file.endpointPath, handler.update);
        }
    }

    async hookHandlersToRouter(router: Router, handler: Handler, hf: HandlerFile) {
        if (handler.get) {
            router.get(hf.file.endpointPath, handler.get);
        }
        if (handler.post) {
            router.post(hf.file.endpointPath, handler.post);
        }
        if (handler.put) {
            router.put(hf.file.endpointPath, handler.put);
        }
        if (handler.delete) {
            router.delete(hf.file.endpointPath, handler.delete);
        }
        if (handler.patch) {
            router.patch(hf.file.endpointPath, handler.patch);
        }
        if (handler.option) {
            router.option(hf.file.endpointPath, handler.option);
        }
        if (handler.update) {
            router.update(hf.file.endpointPath, handler.update);
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


}

