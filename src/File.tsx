import { Dirent } from 'fs';
import * as path from 'path';
import type { HandlerExport } from './HandlerExport';
import type { Xerus } from './Xerus';
import type { Router } from './Router';
import { readdir } from 'node:fs/promises';
import type { RouterExport } from './RouterExport';


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
        this.errFailedToLoadModule = (absolutePath: string) => `failed to load module at: ${absolutePath}`;
        this.errFailedToLoadFiles = (dirname: string) => `failed to load files at and below: ${dirname}`;
    }

    async getExport(exportName: string): Promise<any> {
        let tsModule = await import(this.absolutePath);
        if (!tsModule) {
            throw new Error(this.errFailedToLoadModule(this.absolutePath));
        }
        let exported: any | undefined = tsModule[exportName];
        if (!exported) {
            throw new Error(this.errFailedToLoadModule(this.absolutePath));
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

    async getChildRouterFiles(): Promise<RouterFile[]> {
        let childFiles = await this.file.getChildFiles();
        let filteredFiles = [];
        for (let i = 0; i < childFiles.length; i++) {
            let cf = childFiles[i];
            if (cf.absolutePath == this.file.absolutePath) {
                continue; // skip self
            }
            if (cf.details.name === '+router.ts') {
                filteredFiles.push(cf);
            }
        }
        let routerFilesPromises: Promise<RouterFile>[] = filteredFiles.map(async (file) => await new RouterFile(file));
        let routerFiles: RouterFile[] = await Promise.all(routerFilesPromises);
        return routerFiles;
    }

    async getRouterExport(): Promise<RouterExport> {
        return await this.file.getExport('router') as RouterExport;
    }

}


export class HandlerFile {
    file: File
    routerFile: RouterFile | undefined

    constructor(file: File) {
        this.file = file
        this.routerFile = undefined
    }

    async getHandlerExport(): Promise<HandlerExport> {
        return await this.file.getExport('handler') as HandlerExport;
    }

    async hookToApp(app: Xerus) {
        let handler = await this.getHandlerExport();
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
        let handler = await this.getHandlerExport();
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
