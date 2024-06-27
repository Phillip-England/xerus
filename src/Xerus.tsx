import type { HandlerFunc } from "./HandlerFunc";
import { Router } from "./Router";
import { XerusCtx, type MiddlewareFunc, type PluginFunc, type XerusRequest } from "./export";

export class Xerus {
    routers: { [key: string]: Router }
    middleware: MiddlewareFunc[]
    globalMiddleware: MiddlewareFunc[]
    xerusCtx: (request: Request) => Promise<XerusCtx>
    noLogPathPrefixes: string[]
    notFoundHandler: HandlerFunc | null
    useLogger: boolean
    server: any // Store the server instance

    constructor() {
        this.notFoundHandler = async (ctx: XerusCtx) => {
            ctx.xerusRes.setStatus(404)
            ctx.xerusRes.setBody("Not Found")
        }
        this.noLogPathPrefixes = ["/favicon.ico", "/static"]
        this.middleware = []
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

    plugin(plugin: PluginFunc) {
        plugin(this)
    }

    global(middleware: MiddlewareFunc) {
        this.globalMiddleware.push(middleware)
    }

    use(middleware: MiddlewareFunc) {
        this.middleware.push(middleware)
    }

    get(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].getRoutes[path]) {
            this.routers['/'].get(path, handler)
        }
    }

    post(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].postRoutes[path]) {
            this.routers['/'].post(path, handler)
        }
    }

    put(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].putRoutes[path]) {
            this.routers['/'].put(path, handler)
        }
    }

    patch(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].patchRoutes[path]) {
            this.routers['/'].patch(path, handler)
        }
    }

    update(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].updateRoutes[path]) {
            this.routers['/'].update(path, handler)
        }
    }

    delete(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].deleteRoutes[path]) {
            this.routers['/'].delete(path, handler)
        }
    }

    option(path: string, handler: HandlerFunc) {
        if (!this.routers['/'].optionRoutes[path]) {
            this.routers['/'].option(path, handler)
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

    run(port: number) {
        // Stop the server if it's already running
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
        this.server = Bun.serve(options);
    }

    stop() {
        if (this.server) {
            this.server.stop();
            this.server = null;
        }
    }

    async handleRequest(request: Request, path: string): Promise<Response> {
        const method = request.method
        const router = this.pullRouter(path)
        const route = router.route(router.prefix, path, method)
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
        if (this.notFoundHandler) {
            await this.notFoundHandler(ctx)
            if (ctx.xerusRes.ready) {
                return new Response(ctx.xerusRes.body, { status: ctx.xerusRes.status, headers: ctx.xerusRes.headers })
            } else {
                return new Response("Xerus: failed to return a response from middleware or handler", { status: 500 })
            }

        } else {
            return new Response('Not Found', { status: 404 })
        }
    }

    async setCustom404(handler: HandlerFunc) {
        this.notFoundHandler = handler
    }


}
