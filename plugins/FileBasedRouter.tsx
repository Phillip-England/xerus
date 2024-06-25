import { Router, type HandlerFunc, type PluginFunc, type Xerus } from "../src/export"
import { readdir } from 'node:fs/promises'
import { Dirent } from 'node:fs'
import { File } from "../src/File"



export class FileBasedRouter {
    
    app: Xerus
    handlerFiles: File[]
    routerFiles: File[]

    constructor(app: Xerus) {
        this.app = app
        this.handlerFiles = []
        this.routerFiles = []
    }

    async mount(dirname: string) {
        const systemFiles: Dirent[] = await readdir(dirname, {
            withFileTypes: true,
            recursive: true,
        })
        for (const file of systemFiles) {
            if (file.isFile()) {
                if (file.name === '+handler.tsx') {
                    this.handlerFiles.push(new File(file))

                }
                if (file.name === '+router.tsx') {
                    this.routerFiles.push(new File(file))
                }
            }
        }
        await this.initHandlers()
    }

    async initHandlers() {
        for (const r of this.routerFiles) {
            for (const h of this.handlerFiles) {
                let routerModule = await import(r.absolutePath)
                let handlerModule = await import(h.absolutePath)
                if (!routerModule || !handlerModule) {
                    continue
                }
                let router: Router = routerModule.default
                let handler: HandlerFile = handlerModule.default
                if (!handler || !router) {
                    continue
                }
                let routerPrefix = router.prefix
                let handlerContainsPrefix = h.relativePath.startsWith(routerPrefix)
                if (handlerContainsPrefix) {
                    this.hookHandlersToRouters(router, handler)
                } else {
                    this.hookHandlersToRouters(this.app, handler)
                }
            }
        }
        for (const r of this.routerFiles) {
            let routerModule = await import(r.absolutePath)
            if (!routerModule) {
                continue
            }
            let router: Router = routerModule.default
            if (!router) {
                continue
            }
            this.app.mountRouters(router)
        }
    }

    async hookHandlersToRouters(router: Router | Xerus, handler: HandlerFile) {
        if (handler.get) {
            router.get('/', handler.get)
        }
        if (handler.post) {
            router.post('/', handler.post)
        }
        if (handler.put) {
            router.put('/', handler.put)
        }
        if (handler.delete) {
            router.delete('/', handler.delete)
        }
        if (handler.patch) {
            router.patch('/', handler.patch)
        }
        if (handler.options) {
            router.option('/', handler.options)
        }
        if (handler.update) {
            router.update('/', handler.update)
        }
    }


}

export class HandlerFile {
    get: HandlerFunc | null = null;
    post: HandlerFunc | null = null;
    put: HandlerFunc | null = null;
    delete: HandlerFunc | null = null;
    patch: HandlerFunc | null = null;
    options: HandlerFunc | null = null;
    update: HandlerFunc | null = null;

    constructor() {
        this.get = null;
        this.post = null;
        this.put = null;
        this.delete = null;
        this.patch = null;
        this.options = null;
        this.update = null;
    }

}
