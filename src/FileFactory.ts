import { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import type { Xerus } from "./Xerus";
import { HandlerFile } from './HandlerFile';
import { MiddlewareFile } from './MiddlewareFile';
import { File } from './File';

export class FileFactory {
    handlerFileNames: string[];
    handlerFiles: HandlerFile[] = [];
    appInitFileNames: string[];
    appInitFiles: File[] = [];
    middlewareFileNames: string[] = [];
    middlewareFiles: MiddlewareFile[] = [];

    constructor() {
        this.handlerFileNames = ['+handler.ts', '+handler.tsx']
        this.appInitFileNames = ['+init.ts']
        this.middlewareFileNames = ['+middleware.ts']

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
        let filtered = systemFiles.filter((file) => {
            return file.isFile()
        })
        return filtered;
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

    errAppDirNotFound = (dirname: string) => `app directory does not exist: ${dirname}`
}