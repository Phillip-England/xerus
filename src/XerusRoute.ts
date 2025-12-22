import { HTTPContext } from "./HTTPContext";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Method } from "./Method";
import type { Validator } from "./Validator";
import type { XerusMiddleware } from "./Middleware";

// REMOVED: <T>
type MiddlewareInput =
  | XerusMiddleware
  | (new (...args: any[]) => XerusMiddleware);

function isCtor(x: any): x is new (...args: any[]) => any {
  return typeof x === "function" && x.prototype &&
    x.prototype.constructor === x;
}

// REMOVED: <T>
export abstract class XerusRoute {
  abstract method: Method;
  abstract path: string;

  validators: Validator<any>[] = [];
  public _middlewares: XerusMiddleware[] = [];
  public _errHandler?: HTTPErrorHandlerFunc;

  onMount(): void {}

  async validate(_c: HTTPContext): Promise<void> {}
  async preHandle(_c: HTTPContext): Promise<void> {}
  async postHandle(_c: HTTPContext): Promise<void> {}
  async onFinally(_c: HTTPContext): Promise<void> {}

  abstract handle(c: HTTPContext): Promise<void>;

  use(...middlewares: MiddlewareInput[]): this {
    const normalized = middlewares.map((m) => {
      if (isCtor(m)) {
        return new m();
      }
      return m;
    });
    this._middlewares.push(...(normalized as XerusMiddleware[]));
    return this;
  }

  onErr(handler: HTTPErrorHandlerFunc): this {
    this._errHandler = handler;
    return this;
  }
}
