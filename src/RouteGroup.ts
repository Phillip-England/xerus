import { Xerus } from "./Xerus";
import { Middleware } from "./Middleware";
import { XerusRoute } from "./XerusRoute";

/**
 * Groups routes under a common path prefix and shared middleware.
 * Works with the "mount(routeCtor)" style API.
 */
export class RouteGroup<T extends Record<string, any> = Record<string, any>> {
  app: Xerus<T>;
  prefixPath: string;
  middlewares: Middleware<T>[];

  constructor(app: Xerus<T>, prefixPath: string, ...middlewares: Middleware<T>[]) {
    this.app = app;
    this.prefixPath = prefixPath === "/" ? "/" : prefixPath.replace(/\/+$/, "");
    this.middlewares = middlewares;
  }

  /**
   * Mount route constructors, applying the group's prefix and middleware.
   *
   * Usage:
   *   group.mount(GetUsersRoute, CreateUserRoute)
   */
  mount(...routeCtors: Array<new () => XerusRoute<T, any>>) {
    for (const BaseCtor of routeCtors) {
      const groupPrefix = this.prefixPath;
      const groupMws = this.middlewares;

      // XerusRoute is abstract; TS can't prove BaseCtor is concrete here.
      // We extend via `any` to avoid abstract-member errors.
      const Base: any = BaseCtor;

      class GroupedRoute extends Base {
        onMount(): void {
          // allow route's own mount-time setup
          super.onMount?.();

          // prefix path on the instance Xerus is registering
          const basePath = (this as any).path as string;
          const prefixed =
            groupPrefix === "/"
              ? basePath
              : (groupPrefix + (basePath === "/" ? "" : basePath)).replace(/\/{2,}/g, "/");

          (this as any).path = prefixed;

          // apply group middleware (applies to both HTTP + WS in your current Xerus.ts)
          if (groupMws.length > 0) {
            this.use(...groupMws);
          }
        }
      }

      this.app.mount(GroupedRoute as any);
    }

    return this;
  }
}
