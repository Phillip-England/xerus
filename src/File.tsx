import { Dirent } from 'fs';
import * as path from 'path';
import type { Handler } from './Handler';

export class File {
    details: Dirent
    endpointPath: string
    relativePath: string
    absolutePath: string
    errFailedToLoadModule: Function;


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

}

export class HandlerFile {
    file: File

    constructor(file: File) {
        this.file = file
    }

    async getHandler(): Promise<Handler> {
        return await this.file.getExport('handler') as Handler;
    }

}
