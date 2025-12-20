import { Xerus } from "./Xerus";
import { Middleware } from "./Middleware";
import type { HTTPHandlerFunc } from "./HTTPHandlerFunc";
import type {
  WSCloseFunc,
  WSDrainFunc,
  WSMessageFunc,
  WSOpenFunc,
} from "./WSHandlerFuncs";

export class RouteGroup {
  app: Xerus;
  prefixPath: string;
  middlewares: Middleware[];

  constructor(app: Xerus, prefixPath: string, ...middlewares: Middleware[]) {
    this.app = app;
    this.prefixPath = prefixPath;
    this.middlewares = middlewares;
  }

  // --- HTTP Methods ---

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

  // --- WebSocket Methods ---

  open(path: string, handler: WSOpenFunc, ...middlewares: Middleware[]) {
    this.app.open(
      this.prefixPath + path,
      handler,
      ...this.middlewares.concat(middlewares),
    );
    return this;
  }

  message(
    path: string,
    handler: WSMessageFunc,
    ...middlewares: Middleware[]
  ) {
    this.app.message(
      this.prefixPath + path,
      handler,
      ...this.middlewares.concat(middlewares),
    );
    return this;
  }

  close(path: string, handler: WSCloseFunc, ...middlewares: Middleware[]) {
    this.app.close(
      this.prefixPath + path,
      handler,
      ...this.middlewares.concat(middlewares),
    );
    return this;
  }

  drain(path: string, handler: WSDrainFunc, ...middlewares: Middleware[]) {
    this.app.drain(
      this.prefixPath + path,
      handler,
      ...this.middlewares.concat(middlewares),
    );
    return this;
  }
}