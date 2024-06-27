import { $, sleep } from "bun";
import type { HandlerFunc } from "./HandlerFunc";
import { Router } from "./Router";
import { XerusCtx, type MiddlewareFunc,  type XerusRequest } from "./export";
import { Result } from "./Result";

export class Xerus {
    routers: { [key: string]: Router }
    routes: { [key: string]: HandlerFunc }
    middleware: MiddlewareFunc[]
    globalMiddleware: MiddlewareFunc[]
    xerusCtx: (request: Request) => Promise<XerusCtx>
    noLogPathPrefixes: string[]
    notFoundHandler: HandlerFunc
    useLogger: boolean
    server: any

    constructor() {
        this.notFoundHandler = async (ctx: XerusCtx) => {
            ctx.xerusRes.setStatus(404)
            ctx.xerusRes.setBody("Not Found")
        }
        this.noLogPathPrefixes = ["/favicon.ico", "/static"]
        this.middleware = []
        this.routes = {}
        this.globalMiddleware = []
        this.routers = {
            "/": new Router('/')
        }
        this.xerusCtx = async (request: Request): Promise<XerusCtx> => {
            return new XerusCtx(request)
        }
        this.useLogger = true
        this.server = null
    }

    static async new(): Promise<Result<Xerus, Error>> {
        return await Result.new(new Xerus())
    } 

    global(middleware: MiddlewareFunc) {
        this.globalMiddleware.push(middleware)
    }

    use(middleware: MiddlewareFunc) {
        this.middleware.push(middleware)
    }

    getSearchPath(path: string): string {
        return this.routers['/'].getSearchPath('/', path)
    }

    get(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].getRoutes[path]) {
            this.routers['/'].get(path, handler)
            this.routes[path] = handler
        }
    }

    post(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].postRoutes[path]) {
            this.routers['/'].post(path, handler)
            this.routes[path] = handler
        }
    }

    put(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].putRoutes[path]) {
            this.routers['/'].put(path, handler)
            this.routes[path] = handler
        }
    }

    patch(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].patchRoutes[path]) {
            this.routers['/'].patch(path, handler)
            this.routes[path] = handler
        }
    }

    update(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].updateRoutes[path]) {
            this.routers['/'].update(path, handler)
            this.routes[path] = handler
        }
    }

    delete(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].deleteRoutes[path]) {
            this.routers['/'].delete(path, handler)
            this.routes[path] = handler
        }
    }

    option(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].optionRoutes[path]) {
            this.routers['/'].option(path, handler)
            this.routes[path] = handler
        }
    }

    pullRouter(prefix: string): Router {
        for (let key in this.routers) {
            if (key === "/") {
                continue
            }
            if (prefix.startsWith(key)) {
                return this.routers[key]
            }
        }
        return this.routers['/']
    }

    spawnRouter(prefix: string): Router {
        let router = new Router(prefix)
        return router
    }

    mountRouters(...routers: Router[]) {
        for (let router of routers) {
            this.routers[router.prefix] = router
        }
    }

    async run(port: number) {
        if (this.server) {
            this.server.stop();
        }

        let options = {
            port: port,
            fetch: async (request: Request): Promise<Response> => {
                let startTime = Date.now()
                const path = new URL(request.url).pathname
                let response = await this.handleRequest(request, path)
                if (this.noLogPathPrefixes.some(prefix => path.startsWith(prefix))) {
                    return response
                }
                let endTime = Date.now()
                let timeTook = endTime - startTime
                if (this.useLogger) {
                    console.log(`[${response.status}][${request.method}][${path}][${timeTook}ms]`)
                }
                return response
            }
        }
        console.log("🚀 Xerus is running on port", port)
        this.server = Bun.serve(options);
    }

    async stop() {
        if (this.server) {
            this.server.stop();
            this.server = null;
        }
        await sleep(100)
    }

    async requestIs405(router: Router, method: string, path: string): Promise<boolean> {
        if (!router.routes[path]) {
            return false
        }
        switch (method) {
            case "GET":
                if (router.getRoutes[path] || router.getDynamicRoutes[path]) {
                    return false
                }
                break
            case "POST":
                if (router.postRoutes[path] || router.postDynamicRoutes[path]) {
                    return false
                }
                break
            case "PUT":
                if (router.putRoutes[path] || router.putDynamicRoutes[path]) {
                    return false
                }
                break
            case "PATCH":
                if (router.patchRoutes[path] || router.patchDynamicRoutes[path]) {
                    return false
                }
                break
            case "UPDATE":
                if (router.updateRoutes[path] || router.updateDynamicRoutes[path]) {
                    return false
                }
                break
            case "DELETE":
                if (router.deleteRoutes[path] || router.deleteDynamicRoutes[path]) {
                    return false
                }
                break
            case "OPTION":
                if (router.optionRoutes[path] || router.optionDynamicRoutes[path]) {
                    return false
                }
                break
        }
        return true
    }

    async handleRequest(request: Request, path: string): Promise<Response> {
        const method = request.method
        const router = this.pullRouter(path)
        const route = router.route(router.prefix, path, method)
        let is405 = await this.requestIs405(router, method, router.getSearchPath(router.prefix, path))
        if (is405) {
            return new Response("Method Not Allowed", { status: 405 })
        }
        let ctx = await this.xerusCtx(request)
        let xerusReq = ctx.xerusReq as XerusRequest
        xerusReq.req = request
        for (let middleware of this.globalMiddleware) {
            await middleware(ctx)
            if (ctx.xerusRes.ready) {
                return new Response(ctx.xerusRes.body, { status: ctx.xerusRes.status, headers: ctx.xerusRes.headers })
            }
        }
        if (router.prefix === "/") {
            for (let middleware of this.middleware) {
                await middleware(ctx)
                if (ctx.xerusRes.ready) {
                    return new Response(ctx.xerusRes.body, { status: ctx.xerusRes.status, headers: ctx.xerusRes.headers })
                }
            }
        }
        for (let middleware of router.middleware) {
            await middleware(ctx)
            if (ctx.xerusRes.ready) {
                return new Response(ctx.xerusRes.body, { status: ctx.xerusRes.status, headers: ctx.xerusRes.headers })
            }
        }
        if (route) {
            route.handler(ctx)
            if (ctx.xerusRes.ready) {
                return new Response(ctx.xerusRes.body, { status: ctx.xerusRes.status, headers: ctx.xerusRes.headers })
            } else {
                return new Response("Xerus: failed to return a response from handler", { status: 500 })
            }
        }
        await this.notFoundHandler(ctx)
        if (ctx.xerusRes.ready) {
            return new Response(ctx.xerusRes.body, { status: ctx.xerusRes.status, headers: ctx.xerusRes.headers })
        } else {
            return new Response("Xerus: failed to return a response from Xerus.notFoundHandler", { status: 500 })
        }
    }

    async setCustom404(handler: HandlerFunc) {
        this.notFoundHandler = handler
    }


}
