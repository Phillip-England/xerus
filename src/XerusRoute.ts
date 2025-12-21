// PATH: /home/jacex/src/xerus/src/XerusRoute.ts
import { HTTPContext } from "./HTTPContext";
import { Middleware } from "./Middleware";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Method } from "./Method";

// FIX: C allows any type (WSContext OR HTTPContext) to support both route types
export abstract class XerusRoute<T extends Record<string, any> = Record<string, any>, C = HTTPContext<T>> {
  abstract method: Method;
  abstract path: string;
  public _middlewares: Middleware<T>[] = [];
  public _errHandler?: HTTPErrorHandlerFunc;

  abstract handle(c: C): Promise<void>;
  async validate(c: C): Promise<void> {}
  
  onMount(): void {}

  use(...middlewares: Middleware<T>[]): this {
    this._middlewares.push(...middlewares);
    return this;
  }

  onErr(handler: HTTPErrorHandlerFunc): this {
    this._errHandler = handler;
    return this;
  }
}