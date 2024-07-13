import { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import type { Xerus } from "./Xerus";
import type { FileBasedRouter, Handler, HandlerExport } from './export';



export class XerusClient {
    app: Xerus
    router: FileBasedRouter
    
    constructor(app: Xerus, router: FileBasedRouter) {
        this.app = app
        this.router = router
    }

    async getHandlerFiles(): Promise<HandlerExport[]> {
        let handlerFiles = []
        for (let handlerFile of this.router.handlerFiles) {
            let handlerExport = await handlerFile.getHandlerExport()
            if (handlerExport.get) {
                handlerFiles.push(handlerExport)
                console.log(handlerExport.get)
            }
        }
        return handlerFiles
    }



}