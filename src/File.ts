import { Dirent } from 'fs';
import * as path from 'path';
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
