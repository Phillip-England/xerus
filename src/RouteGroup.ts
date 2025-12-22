import { Xerus } from "./Xerus";
import type { XerusMiddleware } from "./Middleware";
import { XerusRoute } from "./XerusRoute";

// REMOVED: <T>
type MwLike =
  | XerusMiddleware
  | (new () => XerusMiddleware);

// REMOVED: <T>
export class RouteGroup {
  app: Xerus;
  prefixPath: string;
  middlewares: MwLike[];

  constructor(app: Xerus, prefixPath: string, ...middlewares: MwLike[]) {
    this.app = app;
    this.prefixPath = prefixPath === "/" ? "/" : prefixPath.replace(/\/+$/, "");
    this.middlewares = middlewares;
  }

  mount(...routeCtors: Array<new () => XerusRoute>) {
    for (const BaseCtor of routeCtors) {
      const groupPrefix = this.prefixPath;
      const groupMws = this.middlewares;
      const Base: any = BaseCtor;

      class GroupedRoute extends Base {
        onMount(): void {
          super.onMount?.();
          const basePath = (this as any).path as string;
          const prefixed = groupPrefix === "/"
            ? basePath
            : (groupPrefix + (basePath === "/" ? "" : basePath)).replace(
              /\/{2,}/g,
              "/",
            );

          (this as any).path = prefixed;

          if (groupMws.length > 0) {
            this.use(...(groupMws as any));
          }
        }
      }
      this.app.mount(GroupedRoute as any);
    }
    return this;
  }
}
