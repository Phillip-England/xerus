import type { AppContext } from "./AppContext";
import type { HandlerFunc } from "./HandlerFunc";
import type { MiddlewareFunc } from "./MiddlewareFunc";
import { Router } from "./Router";

export class Xerus {

    routers: {[key: string]: Router}
    middleware: MiddlewareFunc[]
    appContext: () => Promise<AppContext>

    constructor() {
        this.middleware = []
        this.routers = {
            "/": new Router('/')
        }
        this.appContext = async (): Promise<AppContext> => {
            return {
                request: null,
                response: {
                    status: 200,
                    body: '',
                    headers: {},
                    ready: false
                }
            }
        }
    }

    use(middleware: MiddlewareFunc) {
        this.middleware.push(middleware)
    }

    get(path: string, handler: HandlerFunc) {
        this.routers['/'].get(path, handler)
    }

    post(path: string, handler: HandlerFunc) {
        this.routers['/'].post(path, handler)
    }

    patch(path: string, handler: HandlerFunc) {
        this.routers['/'].patch(path, handler)
    }

    update(path: string, handler: HandlerFunc) {
        this.routers['/'].update(path, handler)
    }

    delete(path: string, handler: HandlerFunc) {
        this.routers['/'].delete(path, handler)
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
        let options = {
            port: port,
            fetch: async (request: Request): Promise<Response> => {
                let startTime = Date.now()
                const path = new URL(request.url).pathname
                let response = await this.handleRequest(request, path)
                let endTime = Date.now()
                let timeTook = endTime - startTime
                console.log(`[${response.status}][${request.method}][${path}][${timeTook}ms]`)
                return response
            }
        }
        console.log('app running on port ' + port)
        Bun.serve(options);
    }

    async handleRequest(request: Request, path: string): Promise<Response> {
        const method = request.method
        const router = this.pullRouter(path)
        const route = router.route(router.prefix, path, method)
        let ctx = await this.appContext()
        ctx.request = request
        for (let middleware of this.middleware) {
            await middleware(ctx) 
            if (ctx.response.ready) {
                return new Response(ctx.response.body, {status: ctx.response.status, headers: ctx.response.headers})
            }
        }
        for (let middleware of router.middleware) {
            await middleware(ctx) 
            if (ctx.response.ready) {
                return new Response(ctx.response.body, {status: ctx.response.status, headers: ctx.response.headers})
            }
        }
        if (route) {
            route.handler(ctx)
            return new Response(ctx.response.body, {status: ctx.response.status, headers: ctx.response.headers})
        }
        return new Response('Not Found', {status: 404})
    }

}