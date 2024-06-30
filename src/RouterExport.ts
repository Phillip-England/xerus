import type { Router } from "./Router"
import type { Xerus } from "./Xerus"
import { ERR_DBG } from "./XerusErr";


export class RouterExport {
    onMount: (app: Xerus, router: Router) => Promise<void>
    childOnMounts: Array<(app: Xerus, router: Router) => Promise<void>>;
    doesInherit: boolean

    constructor(doesInherit: boolean, onMount: (app: Xerus, router: Router) => Promise<void>) {
        this.onMount = onMount
        this.childOnMounts = []
        this.doesInherit = doesInherit
    }

    inheritOnMountOf(routerExport: RouterExport) {
        this.childOnMounts.push(routerExport.onMount)
    }

    mount(app: Xerus, prefix: string) {
        let router = app.spawnRouter(prefix)
        for (let gmw of app.globalMiddleware) {
            router.middleware.push(gmw)
        }
        for (let childOnMount of this.childOnMounts) {
            childOnMount(app, router)
        }
        this.onMount(app, router)
        app.mountRouters(router)
    }


}