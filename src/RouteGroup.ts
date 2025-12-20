import { Xerus } from "./Xerus";
import { Middleware } from "./Middleware";
import { Route } from "./Route";
import { WSRoute } from "./WSRoute";
import { HTTPContext } from "./HTTPContext";

export class RouteGroup {
  app: Xerus;
  prefixPath: string;
  middlewares: Middleware<HTTPContext>[];

  constructor(app: Xerus, prefixPath: string, ...middlewares: Middleware<HTTPContext>[]) {
    this.app = app;
    this.prefixPath = prefixPath;
    this.middlewares = middlewares;
  }

  /**
   * Mounts a Route or WSRoute to the application with the group's prefix and middleware.
   */
  mount(route: Route | WSRoute) {
    // 1. Prefix the path
    route.path = this.prefixPath + route.path;

    // 2. Apply Group Middlewares (HTTP Routes only)
    if (route instanceof Route) {
      // Prepend group middlewares to the route's middleware stack
      route.use(...this.middlewares);
    } 
    // Note: For WSRoute, we usually don't apply HTTP middlewares blindly 
    // because they are specific to Open/Message events. 
    // Users should attach specific WS middleware manually or we'd need more complex logic here.

    // 3. Mount to App
    this.app.mount(route);
    return this;
  }
}