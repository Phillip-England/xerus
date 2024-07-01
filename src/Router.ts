import type { HandlerFile } from "./HandlerFile";
import type { Handler } from "./HandlerFunc";
import type { MiddlewareFunc } from "./MiddlewareFunc";
import { Route } from "./Route";

export class Router {
    routes: string[];
    getRoutes: { [key: string]: Route };
    getDynamicRoutes: { [key: string]: Route };
    postRoutes: { [key: string]: Route };
    postDynamicRoutes: { [key: string]: Route };
    patchRoutes: { [key: string]: Route };
    patchDynamicRoutes: { [key: string]: Route };
    updateRoutes: { [key: string]: Route };
    updateDynamicRoutes: { [key: string]: Route };
    deleteRoutes: { [key: string]: Route };
    deleteDynamicRoutes: { [key: string]: Route };
    optionRoutes: { [key: string]: Route };
    optionDynamicRoutes: { [key: string]: Route };
    putRoutes: { [key: string]: Route };
    putDynamicRoutes: { [key: string]: Route };

    constructor() {
        this.routes = [];
        this.getRoutes = {};
        this.getDynamicRoutes = {};
        this.postRoutes = {};
        this.postDynamicRoutes = {};
        this.patchRoutes = {};
        this.patchDynamicRoutes = {};
        this.updateRoutes = {};
        this.updateDynamicRoutes = {};
        this.deleteRoutes = {};
        this.deleteDynamicRoutes = {};
        this.optionRoutes = {};
        this.optionDynamicRoutes = {};
        this.putRoutes = {};
        this.putDynamicRoutes = {};
    }

    private addRoute(routeCollection: { [key: string]: Route }, dynamicRouteCollection: { [key: string]: Route }, hf: HandlerFile, method: string, handler: Handler) {
        if (hf.file.endpointPath.includes(':') && !dynamicRouteCollection[hf.file.endpointPath]) {
            dynamicRouteCollection[hf.file.endpointPath] = new Route(hf, method, handler);
            this.routes.push(hf.file.endpointPath)
        } else if (!routeCollection[hf.file.endpointPath]) {
            routeCollection[hf.file.endpointPath] = new Route(hf, method, handler);
            this.routes.push(hf.file.endpointPath);
        } else {
            throw new Error(`Route already exists for ${method} ${hf.file.endpointPath}`);
        }
    }

    get(hf: HandlerFile, handler: Handler) {
        this.addRoute(this.getRoutes, this.getDynamicRoutes, hf, 'GET', handler);
    }

    post(hf: HandlerFile, handler: Handler) {
        this.addRoute(this.postRoutes, this.postDynamicRoutes, hf, 'POST', handler);
    }

    patch(hf: HandlerFile, handler: Handler) {
        this.addRoute(this.patchRoutes, this.patchDynamicRoutes, hf, 'PATCH', handler);
    }

    delete(hf: HandlerFile, handler: Handler) {
        this.addRoute(this.deleteRoutes, this.deleteDynamicRoutes, hf, 'DELETE', handler);
    }

    update(hf: HandlerFile, handler: Handler) {
        this.addRoute(this.updateRoutes, this.updateDynamicRoutes, hf, 'UPDATE', handler);
    }

    put(hf: HandlerFile, handler: Handler) {
        this.addRoute(this.putRoutes, this.putDynamicRoutes, hf, 'PUT', handler);
    }

    option(hf: HandlerFile, handler: Handler) {
        this.addRoute(this.optionRoutes, this.optionDynamicRoutes, hf, 'OPTION', handler);
    }

    private findRoute(routeCollection: { [key: string]: Route }, dynamicRouteCollection: { [key: string]: Route }, searchPath: string): Route | null {
        let route = routeCollection[searchPath];
        if (!route) {
            for (let key in dynamicRouteCollection) {
                let keyParts = key.split('/');
                let searchPathParts = searchPath.split('/');
                if (keyParts.length === searchPathParts.length) {
                    let match = true;
                    for (let i = 0; i < keyParts.length; i++) {
                        if (keyParts[i] !== searchPathParts[i] && !keyParts[i].includes(':')) {
                            match = false;
                            break;
                        }
                    }
                    if (match) {
                        return dynamicRouteCollection[key];
                    }
                }
            }
        }
        return route;
    }

    getRoute(path: string, method: string): Route | null {
        switch (method) {
            case 'GET':
                return this.findRoute(this.getRoutes, this.getDynamicRoutes, path)
            case 'POST':
                return this.findRoute(this.postRoutes, this.postDynamicRoutes, path)
            case 'PATCH':
                return this.findRoute(this.patchRoutes, this.patchDynamicRoutes, path)
            case 'DELETE':
                return this.findRoute(this.deleteRoutes, this.deleteDynamicRoutes, path)
            case 'UPDATE':
                return this.findRoute(this.updateRoutes, this.updateDynamicRoutes, path)
            case 'PUT':
                return this.findRoute(this.putRoutes, this.putDynamicRoutes, path)
            case 'OPTION':
                return this.findRoute(this.optionRoutes, this.optionDynamicRoutes, path)
            default:
                return null
        }
    }
}
