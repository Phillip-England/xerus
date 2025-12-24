import { Xerus } from "./Xerus";
import { XerusRoute } from "./XerusRoute";

/**
 * Groups routes under a common path prefix.
 *
 * Middleware no longer exists in Xerus — services are injected via Inject().
 * So RouteGroup is now ONLY about path prefixing.
 */
export class RouteGroup {
  app: Xerus;
  prefixPath: string;

  constructor(app: Xerus, prefixPath: string) {
    this.app = app;
    this.prefixPath = prefixPath === "/" ? "/" : prefixPath.replace(/\/+$/, "");
  }

  mount(...routeCtors: Array<new () => XerusRoute>) {
    for (const BaseCtor of routeCtors) {
      const groupPrefix = this.prefixPath;
      const Base: any = BaseCtor;

      class GroupedRoute extends Base {
        onMount(): void {
          super.onMount?.();

          const basePath = (this as any).path as string;
          const prefixed =
            groupPrefix === "/"
              ? basePath
              : (groupPrefix + (basePath === "/" ? "" : basePath)).replace(
                  /\/{2,}/g,
                  "/",
                );

          (this as any).path = prefixed;
        }
      }

      this.app.mount(GroupedRoute as any);
    }

    return this;
  }
}
