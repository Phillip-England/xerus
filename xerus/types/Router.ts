import type { HandlerFunc } from "./HandlerFunc";
import type { MiddlewareFunc } from "./MiddlewareFunc";
import { Route } from "./Route";



export class Router {
    prefix: string;
    middleware: MiddlewareFunc[];
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

    constructor(prefix: string) {
        this.prefix = prefix;
        this.middleware = [];
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
    }

    use(middleware: MiddlewareFunc) {
        this.middleware.push(middleware);
    }

    private addRoute(routeCollection: { [key: string]: Route }, dynamicRouteCollection: { [key: string]: Route }, path: string, method: string, handler: HandlerFunc) {
        if (path.includes(':')) {
            dynamicRouteCollection[path] = new Route(this.prefix, path, method, handler);
        } else {
            routeCollection[path] = new Route(this.prefix, path, method, handler);
        }
    }

    get(path: string, handler: HandlerFunc) {
        this.addRoute(this.getRoutes, this.getDynamicRoutes, path, 'GET', handler);
    }

    post(path: string, handler: HandlerFunc) {
        this.addRoute(this.postRoutes, this.postDynamicRoutes, path, 'POST', handler);
    }

    patch(path: string, handler: HandlerFunc) {
        this.addRoute(this.patchRoutes, this.patchDynamicRoutes, path, 'PATCH', handler);
    }

    delete(path: string, handler: HandlerFunc) {
        this.addRoute(this.deleteRoutes, this.deleteDynamicRoutes, path, 'DELETE', handler);
    }

    update(path: string, handler: HandlerFunc) {
        this.addRoute(this.updateRoutes, this.updateDynamicRoutes, path, 'UPDATE', handler);
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

    route(prefix: string, path: string, method: string): Route | null {
        let searchPath: string;
        if (prefix === this.prefix) {
            searchPath = "/";
        } else if (path.startsWith(prefix)) {
            searchPath = path.slice(prefix.length);
        } else {
            return null;
        }

        switch (method) {
            case 'GET':
                return this.findRoute(this.getRoutes, this.getDynamicRoutes, searchPath);
            case 'POST':
                return this.findRoute(this.postRoutes, this.postDynamicRoutes, searchPath);
            case 'PATCH':
                return this.findRoute(this.patchRoutes, this.patchDynamicRoutes, searchPath);
            case 'DELETE':
                return this.findRoute(this.deleteRoutes, this.deleteDynamicRoutes, searchPath);
            case 'UPDATE':
                return this.findRoute(this.updateRoutes, this.updateDynamicRoutes, searchPath);
            default:
                return null;
        }
    }
}
