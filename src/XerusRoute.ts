import { HTTPContext } from "./HTTPContext";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Method } from "./Method";
import type { Validator } from "./Validator";
import type { XerusMiddleware } from "./Middleware";

export abstract class XerusRoute<T extends Record<string, any> = Record<string, any>> {
  abstract method: Method;
  abstract path: string;

  validators: Validator<any>[] = [];
  public _middlewares: XerusMiddleware<T>[] = [];
  public _errHandler?: HTTPErrorHandlerFunc;

  onMount(): void {} // called once at mount-time

  // called per-request to populate instance data or throw error
  async validate(_c: HTTPContext<T>): Promise<void> {}

  // called per-request before middleware chain starts (after validators)
  async preHandle(_c: HTTPContext<T>): Promise<void> {}

  // called per-request after handle (if no error)
  async postHandle(_c: HTTPContext<T>): Promise<void> {}

  // always called per-request (even if error)
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
