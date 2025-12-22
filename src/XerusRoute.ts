// src/XerusRoute.ts
import { HTTPContext } from "./HTTPContext";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Method } from "./Method";
import type { Validator } from "./Validator";
import type { XerusMiddleware } from "./Middleware";

export abstract class XerusRoute<
  T extends Record<string, any> = Record<string, any>,
> {
  abstract method: Method;
  abstract path: string;

  // still supported
  validators: Validator<any>[] = [];

  public _middlewares: XerusMiddleware<T>[] = [];
  public _errHandler?: HTTPErrorHandlerFunc;

  onMount(): void {} // called once at mount-time
  async validate(_c: HTTPContext<T>): Promise<void> {}
  async preHandle(_c: HTTPContext<T>): Promise<void> {}
  async postHandle(_c: HTTPContext<T>): Promise<void> {}
  async onFinally(_c: HTTPContext<T>): Promise<void> {}

  abstract handle(c: HTTPContext<T>): Promise<void>;

  use(...middlewares: XerusMiddleware<T>[]): this {
    this._middlewares.push(...middlewares);
    return this;
  }

  onErr(handler: HTTPErrorHandlerFunc): this {
    this._errHandler = handler;
    return this;
  }
}
