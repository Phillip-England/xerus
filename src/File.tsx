import { Dirent } from 'fs';
import * as path from 'path';
import type { Handler } from './Handler';
import type { Xerus } from './Xerus';
import type { Router } from './Router';
import { readdir } from 'node:fs/promises';


export class File {
    details: Dirent
    endpointPath: string
    relativePath: string
    absolutePath: string
    errFailedToLoadModule: Function;
    errFailedToLoadFiles: Function;


    constructor(file: Dirent, mountTo: string) {
        this.details = file
        this.endpointPath = ''
        this.relativePath = ''
        this.absolutePath = ''
        mountTo = mountTo.replace('./', '')
        let pathSegment = file.parentPath.replace(mountTo, '')
        if (pathSegment === '') {
            pathSegment = '/'
            this.endpointPath = pathSegment
            this.relativePath = pathSegment + file.name
        } else {
            this.endpointPath = pathSegment
            this.relativePath = pathSegment + '/' + file.name
        }
        this.absolutePath = path.resolve(mountTo + this.relativePath)
        this.errFailedToLoadModule = (fileName: string) => `handler file missing handler module: ${fileName}`;
        this.errFailedToLoadFiles = (dirname: string) => `failed to load files at and below: ${dirname}`;
    }

    async getExport(exportName: string): Promise<any> {
        let tsModule = await import(this.absolutePath);
        if (!tsModule) {
            throw new Error(this.errFailedToLoadModule(this.details.name));
        }
        let exported: any | undefined = tsModule[exportName];
        if (!exported) {
            throw new Error(this.errFailedToLoadModule(this.details.name));
        }
        return exported;
    }

    async getChildFiles(): Promise<File[]> {
        let topdir = this.details.parentPath
        let childFiles: Dirent[]
        try {
            childFiles = await readdir(topdir, {
                withFileTypes: true,
                recursive: true,
            });
        } catch(e: unknown) {
            throw new Error(this.errFailedToLoadFiles(topdir))
        }
        let files: File[] = []
        for (let file of childFiles) {
            files.push(new File(file, topdir))
        }
        return files;
    }

}


export class RouterFile {
    file: File

    constructor(file: File) {
        this.file = file
    }

    async getRouter(): Promise<Router> {
        return await this.file.getExport('router') as Router;
    }

    async mount(app: Xerus) {
        let router = await this.getRouter();
        app.mountRouters(router);
    }

    async getChildHandlerFiles(): Promise<HandlerFile[]> {
        let childFiles = await this.file.getChildFiles();
        for (let i = 0; i < childFiles.length; i++) {
            let cf = childFiles[i]
            if (cf.absolutePath == this.file.absolutePath) {
                continue // skip self
            }
        }
        // let filteredFiles: File[] = []
        // for (const file of childFiles) {
        //     if (file.details.name === '+handler.ts') {
        //         filteredFiles.push(file)
        //     }
        // }
        // let handlerFiles: HandlerFile[] = filteredFiles.map((file) => new HandlerFile(file))
        // return handlerFiles;
        return []
    }

}



export class HandlerFile {
    file: File

    constructor(file: File) {
        this.file = file
    }

    async getHandler(): Promise<Handler> {
        return await this.file.getExport('handler') as Handler;
    }

    async hookToApp(app: Xerus) {
        let handler = await this.getHandler();
        if (handler.get) {
            app.get(this.file.endpointPath, handler.get);
        }
        if (handler.post) {
            app.post(this.file.endpointPath, handler.post);
        }
        if (handler.put) {
            app.put(this.file.endpointPath, handler.put);
        }
        if (handler.delete) {
            app.delete(this.file.endpointPath, handler.delete);
        }
        if (handler.patch) {
            app.patch(this.file.endpointPath, handler.patch);
        }
        if (handler.option) {
            app.option(this.file.endpointPath, handler.option);
        }
        if (handler.update) {
            app.update(this.file.endpointPath, handler.update);
        }
    }

    async hookToRouter(router: Router) {
        let handler = await this.getHandler();
        if (handler.get) {
            router.get(this.file.endpointPath, handler.get);
        }
        if (handler.post) {
            router.post(this.file.endpointPath, handler.post);
        }
        if (handler.put) {
            router.put(this.file.endpointPath, handler.put);
        }
        if (handler.delete) {
            router.delete(this.file.endpointPath, handler.delete);
        }
        if (handler.patch) {
            router.patch(this.file.endpointPath, handler.patch);
        }
        if (handler.option) {
            router.option(this.file.endpointPath, handler.option);
        }
        if (handler.update) {
            router.update(this.file.endpointPath, handler.update);
        }
    }

}
