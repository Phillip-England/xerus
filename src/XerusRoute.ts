// PATH: src/XerusRoute.ts

import { HTTPContext } from "./HTTPContext";
import { Middleware } from "./Middleware";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Method } from "./Method";
import type { Validator } from "./Validator";

/**
 * Base route type for both HTTP + WS routes.
 * WS routes still run middleware on the underlying HTTPContext.
 */
export abstract class XerusRoute<
  T extends Record<string, any> = Record<string, any>,
  C = HTTPContext<T>,
> {
  abstract method: Method;
  abstract path: string;

  /**
   * Validators become "front-loaded middleware" right before execution.
   * They MUST run before any user middleware.
   */
  validators: Validator<any>[] = [];

  public _middlewares: Middleware<T>[] = [];
  public _errHandler?: HTTPErrorHandlerFunc;

  /**
   * Lifecycle hooks
   */
  onMount(): void {} // called once at mount-time
  
  // FIX: Added validate hook
  async validate(_c: C): Promise<void> {} // called per-request to populate instance data or throw error
  
  async preHandle(_c: C): Promise<void> {} // called per-request before middleware chain starts (after validators)
  async postHandle(_c: C): Promise<void> {} // called per-request after handle (if no error)
  async onFinally(_c: C): Promise<void> {} // always called per-request (even if error)

  abstract handle(c: C): Promise<void>;

  use(...middlewares: Middleware<T>[]): this {
    this._middlewares.push(...middlewares);
    return this;
  }

  onErr(handler: HTTPErrorHandlerFunc): this {
    this._errHandler = handler;
    return this;
  }
}