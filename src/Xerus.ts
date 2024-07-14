import { $, sleep } from "bun";
import type { Handler, HandlerFunc } from "./Handler";
import { Router } from "./Router";
import { Route, XerusCtx, type MiddlewareFunc, type XerusRequest } from "./export";
import { ERR_DBG, ERR_METHOD_NOT_ALLOWED, ERR_NO_BODY, ERR_NOT_FOUND } from "./XerusErr";
import { XerusTrace } from "./XerusTrace";
import { renderToString } from "react-dom/server";

export class Xerus {
    router: Router;
    middleware: MiddlewareFunc[];
    noLogPathPrefixes: string[];
    notFoundHandler: Handler | null;
    useLogger: boolean;
    server: any;

    constructor() {
        this.notFoundHandler = null;
        this.noLogPathPrefixes = ["/favicon.ico", "/static"];
        this.middleware = [];
        this.router = new Router();
        this.useLogger = true;
        this.server = null;
    }

    use(...middleware: MiddlewareFunc[]) {
        for (let m of middleware) {
            this.middleware.push(m);
        }
    }

    async run(port: number) {
        if (this.server) {
            this.server.stop();
        }

        let options = {
            port: port,
            fetch: async (request: Request): Promise<Response> => {
                let startTime = Date.now();
                const path = new URL(request.url).pathname;
                let response = await this.handleRequest(request, path);
                if (this.noLogPathPrefixes.some(prefix => path.startsWith(prefix))) {
                    return response;
                }
                let endTime = Date.now();
                let timeTook = endTime - startTime;
                if (this.useLogger) {
                    console.log(`[${response.status}][${request.method}][${path}][${timeTook}ms]`);
                }
                return response;
            }
        };
        console.log("🚀 Xerus is running on port", port);
        this.server = await Bun.serve(options);
    }

    async stop() {
        if (this.server) {
            this.server.stop();
            this.server = null;
        }
        await sleep(100);
    }

    async requestIs405(router: Router, method: string, path: string): Promise<boolean> {
        if (!router.routes.includes(path)) {
            return false;
        }
        switch (method) {
            case "GET":
                if (router.getRoutes[path] || router.getDynamicRoutes[path]) {
                    return false;
                }
                break;
            case "POST":
                if (router.postRoutes[path] || router.postDynamicRoutes[path]) {
                    return false;
                }
                break;
            case "PUT":
                if (router.putRoutes[path] || router.putDynamicRoutes[path]) {
                    return false;
                }
                break;
            case "PATCH":
                if (router.patchRoutes[path] || router.patchDynamicRoutes[path]) {
                    return false;
                }
                break;
            case "UPDATE":
                if (router.updateRoutes[path] || router.updateDynamicRoutes[path]) {
                    return false;
                }
                break;
            case "DELETE":
                if (router.deleteRoutes[path] || router.deleteDynamicRoutes[path]) {
                    return false;
                }
                break;
            case "OPTION":
                if (router.optionRoutes[path] || router.optionDynamicRoutes[path]) {
                    return false;
                }
                break;
        }
        return true;
    }

    async handleRequest(request: Request, path: string): Promise<Response> {
        const method = request.method;
        const router = this.router;
        const route = router.getRoute(path, method);
        let is405 = await this.requestIs405(router, method, path);
        if (is405) {
            return new Response(ERR_METHOD_NOT_ALLOWED, { status: 405 });
        }
        let ctx = new XerusCtx(request);
        let xerusReq = ctx.xerusReq as XerusRequest;
        xerusReq.req = request;
        let response = await this.executeAppLevelMiddleware(ctx);
        if (response) {
            return response;
        }
        response = await this.executeMiddlewareFileMiddleware(ctx, router, route);
        if (response) {
            return response;
        }
        response = await this.executeHandlerLevelMiddleware(ctx, route);
        if (response) {
            return response;
        }
        response = await this.executeHandler(ctx, route);
        if (response) {
            return response;
        }
        return await this.handle404(ctx);
    }

    async executeAppLevelMiddleware(ctx: XerusCtx): Promise<Response | null> {
        for (let middleware of this.middleware) {
            await middleware(ctx);
            if (ctx.xerusRes.ready) {
                return new Response(ctx.xerusRes.body, { status: ctx.xerusRes.status, headers: ctx.xerusRes.headers });
            }
        }
        return null;
    }

    async executeMiddlewareFileMiddleware(ctx: XerusCtx, router: Router, route: Route | null): Promise<Response | null> {
        if (route && route.handlerFile.middlewareFile) {
            let mwFile = route.handlerFile.middlewareFile;
            let mwExport = await mwFile.getMiddlewareExport();
            let middlewares = mwExport.middleware;
            if (middlewares) {
                for (let j = 0; j < middlewares.length; j++) {
                    await middlewares[j](ctx);
                    if (ctx.xerusRes.ready) {
                        return new Response(ctx.xerusRes.body, { status: ctx.xerusRes.status, headers: ctx.xerusRes.headers });
                    }
                }
            }
        }
        return null;
    }

    async executeHandlerLevelMiddleware(ctx: XerusCtx, route: Route | null): Promise<Response | null> {
        if (route && route.handler) {
            for (let i = 0; i < route.handler.middleware.length; i++) {
                let mw: MiddlewareFunc = route.handler.middleware[i];
                await mw(ctx);
                if (ctx.xerusRes.ready) {
                    return new Response(ctx.xerusRes.body, { status: ctx.xerusRes.status, headers: ctx.xerusRes.headers });
                }
            }
        }
        return null;
    }

    async executeHandler(ctx: XerusCtx, route: Route | null): Promise<Response | null> {
        if (route && route.handler && route.handler.handlerFunc) {
            let handlerFunc: HandlerFunc;
            if (route.method === "GET") {
                let exportedHandler = await route.handlerFile.getHandlerExport();
                let loadFunc = exportedHandler.load;
                if (loadFunc) {
                    ctx.setLoadFunc(loadFunc);
                }
                let clientFunc = exportedHandler.client;
                if (clientFunc) {
                    ctx.setClientFunc(clientFunc);
                }
            }
            await route.handler.handlerFunc(ctx);
            if (ctx.xerusRes.ready) {
                if (ctx.xerusReq?.clientFunc) {
                    return new Response(await this.injectClientScript(ctx.xerusRes.body, await ctx.xerusReq.clientFunc()), { status: ctx.xerusRes.status, headers: ctx.xerusRes.headers });
                } else {
                    return new Response(ctx.xerusRes.body, { status: ctx.xerusRes.status, headers: ctx.xerusRes.headers });
                }
            } else {
                return new Response(ERR_NO_BODY, { status: 500 });
            }
        }
        return null;
    }

    async handle404(ctx: XerusCtx): Promise<Response> {
        if (this.notFoundHandler === null || !this.notFoundHandler.handlerFunc) {
            return new Response(ERR_NOT_FOUND, { status: 404 });
        } else {
            await this.notFoundHandler.handlerFunc(ctx);
        }
        if (ctx.xerusRes.ready) {
            return new Response(ctx.xerusRes.body, { status: ctx.xerusRes.status, headers: ctx.xerusRes.headers });
        } else {
            return new Response(ERR_NO_BODY, { status: 500 });
        }
    }

    async setCustom404(handler: Handler) {
        this.notFoundHandler = handler;
    }

    async injectClientScript(responseBody: string, clientScript: string): Promise<string> {
        return responseBody.replace("</body>", `${clientScript}</body>`);
    }

    extractFunctionBody(func: Function): string {
        const funcString = func.toString();
        return funcString.substring(funcString.indexOf("{") + 1, funcString.lastIndexOf("}"));
    }
}
