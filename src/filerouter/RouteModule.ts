import { MiddlwareStradegy } from "./MiddlewareStradegy";
import { Middleware } from "../server/Middleware";
import { HTTPContext } from "../server/HTTPContext";
import type { HTTPHandlerFunc } from "../server/HTTPHandlerFunc";

export class MiddlewareExport {
  stradegy: MiddlwareStradegy;
  middleware: Middleware;
  endpoint: string;
  constructor(stradegy: MiddlwareStradegy, middleware: Middleware) {
    this.stradegy = stradegy;
    this.middleware = middleware;
    this.endpoint = "";
  }
  setEndpoint(endpoint: string) {
    this.endpoint = endpoint;
  }
}

export function isolate(middleware: Middleware): MiddlewareExport {
  return new MiddlewareExport(MiddlwareStradegy.Isolate, middleware);
}

export function cascade(middleware: Middleware): MiddlewareExport {
  return new MiddlewareExport(MiddlwareStradegy.Cascade, middleware);
}

export class RouteModule {
  getFunc: undefined | ((c: HTTPContext) => Promise<Response>);
  getMiddleware: MiddlewareExport[] = [];
  postFunc: undefined | ((c: HTTPContext) => Promise<Response>);
  postMiddleware: MiddlewareExport[] = [];
  putFunc: undefined | ((c: HTTPContext) => Promise<Response>);
  putMiddleware: MiddlewareExport[] = [];
  deleteFunc: undefined | ((c: HTTPContext) => Promise<Response>);
  deleteMiddleware: MiddlewareExport[] = [];
  endpoint: string = ''

  constructor() {}

  get(callback: HTTPHandlerFunc, ...middleware: MiddlewareExport[]) {
    this.getFunc = callback;
    this.getMiddleware = middleware;
    return this;
  }

  post(callback: HTTPHandlerFunc, ...middleware: MiddlewareExport[]) {
    this.postFunc = callback;
    this.postMiddleware = middleware;
    return this;
  }

  put(callback: HTTPHandlerFunc, ...middleware: MiddlewareExport[]) {
    this.putFunc = callback;
    this.putMiddleware = middleware;
    return this;
  }

  delete(callback: HTTPHandlerFunc, ...middleware: MiddlewareExport[]) {
    this.deleteFunc = callback;
    this.deleteMiddleware = middleware;
    return this;
  }
}
