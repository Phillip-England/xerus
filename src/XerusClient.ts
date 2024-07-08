import { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import type { Xerus } from "./Xerus";



export class XerusClient {
    app: Xerus
    errAppDirNotFound = (dirname: string) => `app directory does not exist: ${dirname}`

    
    constructor(app: Xerus) {
        this.app = app
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



}