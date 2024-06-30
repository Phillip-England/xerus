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

    private addRoute(routeCollection: { [key: string]: Route }, dynamicRouteCollection: { [key: string]: Route }, path: string, method: string, handler: Handler) {
        if (path.includes(':') && !dynamicRouteCollection[path]) {
            dynamicRouteCollection[path] = new Route(path, method, handler);
            this.routes.push(path)
        } else if (!routeCollection[path]) {
            routeCollection[path] = new Route(path, method, handler);
            this.routes.push(path);
        } else {
            throw new Error(`Route already exists for ${method} ${path}`);
        }
    }

    get(path: string, handler: Handler) {
        this.addRoute(this.getRoutes, this.getDynamicRoutes, path, 'GET', handler);
    }

    post(path: string, handler: Handler) {
        this.addRoute(this.postRoutes, this.postDynamicRoutes, path, 'POST', handler);
    }

    patch(path: string, handler: Handler) {
        this.addRoute(this.patchRoutes, this.patchDynamicRoutes, path, 'PATCH', handler);
    }

    delete(path: string, handler: Handler) {
        this.addRoute(this.deleteRoutes, this.deleteDynamicRoutes, path, 'DELETE', handler);
    }

    update(path: string, handler: Handler) {
        this.addRoute(this.updateRoutes, this.updateDynamicRoutes, path, 'UPDATE', handler);
    }

    put(path: string, handler: Handler) {
        this.addRoute(this.putRoutes, this.putDynamicRoutes, path, 'PUT', handler);
    }

    option(path: string, handler: Handler) {
        this.addRoute(this.optionRoutes, this.optionDynamicRoutes, path, 'OPTION', handler);
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
