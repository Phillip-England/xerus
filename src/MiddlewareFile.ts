import { File } from './File';
import type { MiddlewareExport } from './MiddlewareExport';
import * as path from 'path';
import { readdir } from 'node:fs/promises';
import { Dirent } from 'fs';
import { HandlerFile } from './HandlerFile';

export class MiddlewareFile {
    file: File

    constructor(file: File) {
        this.file = file
    }

    async getMiddlewareExport(): Promise<MiddlewareExport> {
        return await this.file.getExport('middleware') as MiddlewareExport;
    }

    async getAllChildHandlerFiles(): Promise<HandlerFile[]> {
        let topdir = this.file.details.parentPath
        let childFiles: Dirent[]
        try {
            childFiles = await readdir(topdir, {
                withFileTypes: true,
                recursive: true,
            });
        } catch(e: unknown) {
            throw new Error(this.file.errFailedToLoadFiles(topdir))
        }
        let handlerFiles: HandlerFile[] = []
        for (const file of childFiles) {
            if (file.name === "+handler.ts") {
                handlerFiles.push(new HandlerFile(new File(file, topdir)))
            }
        }
        return handlerFiles
    }

}
