import { Xerus } from "./Xerus";
import { Middleware } from "./Middleware";
import { XerusRoute } from "./XerusRoute";

export class RouteGroup<T extends Record<string, any> = Record<string, any>> {
  app: Xerus<T>;
  prefixPath: string;
  middlewares: Middleware<T>[];

  constructor(app: Xerus<T>, prefixPath: string, ...middlewares: Middleware<T>[]) {
    this.app = app;
    this.prefixPath = prefixPath === "/" ? "/" : prefixPath.replace(/\/+$/, "");
    this.middlewares = middlewares;
  }

  mount(...routeCtors: Array<new () => XerusRoute<T>>) {
    for (const BaseCtor of routeCtors) {
      const groupPrefix = this.prefixPath;
      const groupMws = this.middlewares;
      const Base: any = BaseCtor;

      class GroupedRoute extends Base {
        onMount(): void {
          super.onMount?.();

          const basePath = (this as any).path as string;
          const prefixed =
            groupPrefix === "/"
              ? basePath
              : (groupPrefix + (basePath === "/" ? "" : basePath)).replace(/\/{2,}/g, "/");

          (this as any).path = prefixed;

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
