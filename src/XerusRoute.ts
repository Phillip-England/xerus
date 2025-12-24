// src/XerusRoute.ts
import { HTTPContext } from "./HTTPContext";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Method } from "./Method";
// Removed Middleware imports

export abstract class XerusRoute {
  abstract method: Method;
  abstract path: string;
  
  // No more middleware array. Logic must be in services (Inject) or hooks.
  public _errHandler?: HTTPErrorHandlerFunc;
  public inject: any[] = []; // Still used for manual injections if needed

  onMount(): void {}

  async validate(_c: HTTPContext): Promise<void> {}
  async preHandle(_c: HTTPContext): Promise<void> {}
  async postHandle(_c: HTTPContext): Promise<void> {}
  async onFinally(_c: HTTPContext): Promise<void> {}

  abstract handle(c: HTTPContext): Promise<void>;

  onErr(handler: HTTPErrorHandlerFunc): this {
    this._errHandler = handler;
    return this;
  }
}