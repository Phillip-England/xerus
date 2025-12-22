import { HTTPContext } from "./HTTPContext";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Method } from "./Method";
import type { Validator } from "./Validator";
import type { XerusMiddleware } from "./Middleware";

// Define a type for middleware input: either an instance or a class constructor
type MiddlewareInput<T extends Record<string, any>> = 
  | XerusMiddleware<T>
  | (new (...args: any[]) => XerusMiddleware<T>);

function isCtor(x: any): x is new (...args: any[]) => any {
  return typeof x === "function" && x.prototype && x.prototype.constructor === x;
}

export abstract class XerusRoute<
  T extends Record<string, any> = Record<string, any>,
> {
  abstract method: Method;
  abstract path: string;
  validators: Validator<any>[] = [];
  public _middlewares: XerusMiddleware<T>[] = [];
  public _errHandler?: HTTPErrorHandlerFunc;

  onMount(): void {} // called once at mount-time

  async validate(_c: HTTPContext<T>): Promise<void> {}
  async preHandle(_c: HTTPContext<T>): Promise<void> {}
  async postHandle(_c: HTTPContext<T>): Promise<void> {}
  async onFinally(_c: HTTPContext<T>): Promise<void> {}

  abstract handle(c: HTTPContext<T>): Promise<void>;

  // Update .use() to accept constructors
  use(...middlewares: MiddlewareInput<T>[]): this {
    const normalized = middlewares.map((m) => {
        if (isCtor(m)) {
            return new m();
        }
        return m;
    });
    this._middlewares.push(...(normalized as XerusMiddleware<T>[]));
    return this;
  }

  onErr(handler: HTTPErrorHandlerFunc): this {
    this._errHandler = handler;
    return this;
  }
}