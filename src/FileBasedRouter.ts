import { HandlerExport, HandlerFile, Router, Xerus, type HandlerFunc } from "./export";
import { readdir } from 'node:fs/promises';
import { Dirent } from 'node:fs';
import { File } from "./File";
import { XerusTrace } from "./XerusTrace";
import { ERR_DBG, ERR_NO_ROOT_HANDLER_FILE } from "./XerusErr";
import type { InitExport } from "./InitExport";
import { MiddlewareFile } from "./MiddlewareFile";

export class FileBasedRouter {
    app: Xerus;
    handlerFiles: HandlerFile[];
    handlerFileNames: string[];
    middlewareFiles: MiddlewareFile[];
    middlewareFileNames: string[];
    appInitFiles: File[];
    appInitFileNames: string[];
    goodFileNames: string[];
    errNoAppFile: Function;
    errAppDirNotFound: Function;
    errNoRootHandlerFile: Function;
    errUnknownAppFile: Function;
    errHandlerFileMissingHandlerModule: Function;
    errHandlerFileMissingHandlerClass: Function;
    errInitFileMissingInitModule: Function;
    errInitFileMissingInitFunc: Function;

    constructor(app: Xerus) {
        this.app = app;
        this.handlerFiles = [];
        this.handlerFileNames = ['+handler.ts']
        this.appInitFiles = [];
        this.appInitFileNames = ['+init.ts']
        this.middlewareFiles = [];
        this.middlewareFileNames = ['+middleware.ts']
        this.goodFileNames = [...this.handlerFileNames, ...this.middlewareFileNames,  ...this.appInitFileNames]
        this.errNoAppFile = (dirname: string) => `no +init.ts file found at: ${dirname}`;
        this.errAppDirNotFound = (dirname: string) => `app directory does not exist: ${dirname}`;
        this.errNoRootHandlerFile = (dirname: string) => `no +handler.ts file found at ${dirname}`;
        this.errUnknownAppFile = (fileName: string) => `unknown app file found: ${fileName}`;
        this.errHandlerFileMissingHandlerModule = (fileName: string) => `handler file missing handler module: ${fileName}`;
        this.errHandlerFileMissingHandlerClass = (fileName: string) => `handler file missing handler class: ${fileName}`;
        this.errInitFileMissingInitModule = (fileName: string) => `init file missing init module: ${fileName}`;
        this.errInitFileMissingInitFunc = (fileName: string) => `init file missing init function: ${fileName}`;
        
    }

    async mount(dirname: string) {
        await this.registerFiles(await this.getFiles(dirname), dirname)
        await this.assertInitFileExists(dirname);
        await this.assertRootHandlerExists(dirname);
        await this.assertNoUnknownFiles(dirname);
        await this.applyInitFunc(this.app);
        await this.hookMiddlewareToHandlers();
        await this.hookHandlersToApp(this.app);
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
                if (this.middlewareFileNames.includes(file.name)) {
                    this.middlewareFiles.push(new MiddlewareFile(new File(file, dirname)));
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

    async applyInitFunc(app: Xerus) {
        let initFile = this.appInitFiles[0]
        let initExport: InitExport
        try {
            initExport = await initFile.getExport('init')
        } catch (e: any) {
            throw new Error(this.errInitFileMissingInitModule(initFile.details.name))
        }
        if (!initExport) {
            throw new Error(this.errInitFileMissingInitFunc(initFile.details.name))
        }
        await initExport(app)
        return initExport
    }

    async workOnMiddlewareFiles(callback: (mwFile: MiddlewareFile) => Promise<void>) {
        for (let mwFile of this.middlewareFiles) {
            await callback(mwFile)
        }
    }

    async workOnHandlerFiles(callback: (handlerFile: HandlerFile) => Promise<void>) {
        for (let handlerFile of this.handlerFiles) {
            await callback(handlerFile)
        }
    }

    async hookMiddlewareToHandlers() {
        await this.workOnMiddlewareFiles(async (mwFile) => {
            await this.workOnHandlerFiles(async (handlerFile) => {
                let mwSlashCount = mwFile.file.absolutePath.split('/').length
                let handlerSlashCount = handlerFile.file.absolutePath.split('/').length
                if (mwSlashCount <= handlerSlashCount) {
                    handlerFile.setMiddlewareFile(mwFile)
                }
            })
        })
    }

    async hookHandlersToApp(app: Xerus) {
        for (let hf of this.handlerFiles) {
            await hf.hookToApp(app)
        }
    }

}

