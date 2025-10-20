import { Xerus } from "./Xerus";
import { Middleware } from "./Middleware";
import type { HTTPHandlerFunc } from "./HTTPHandlerFunc";

export class RouteGroup {
  app: Xerus;
  prefixPath: string;
  middlewares: Middleware[];
  constructor(app: Xerus, prefixPath: string, ...middlewares: Middleware[]) {
    this.app = app;
    this.prefixPath = prefixPath;
    this.middlewares = middlewares;
  }

  get(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware[]) {
    this.app.get(
      this.prefixPath + path,
      handler,
      ...this.middlewares.concat(middlewares),
    );
    return this;
  }
  post(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware[]) {
    this.app.post(
      this.prefixPath + path,
      handler,
      ...this.middlewares.concat(middlewares),
    );
    return this;
  }
  put(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware[]) {
    this.app.put(
      this.prefixPath + path,
      handler,
      ...this.middlewares.concat(middlewares),
    );
    return this;
  }
  delete(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware[]) {
    this.app.delete(
      this.prefixPath + path,
      handler,
      ...this.middlewares.concat(middlewares),
    );
    return this;
  }
  patch(path: string, handler: HTTPHandlerFunc, ...middlewares: Middleware[]) {
    this.app.patch(
      this.prefixPath + path,
      handler,
      ...this.middlewares.concat(middlewares),
    );
    return this;
  }
}

