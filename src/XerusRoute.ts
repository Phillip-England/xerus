// --- START FILE: src/XerusRoute.ts ---
import { HTTPContext } from "./HTTPContext";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Method } from "./Method";
import type { ServiceLifecycle } from "./RouteFields";
import type { TypeValidator } from "./TypeValidator";

export abstract class XerusRoute {
  abstract method: Method;
  abstract path: string;

  public _errHandler?: HTTPErrorHandlerFunc;

  /**
   * Declare services required by this route.
   * These services become available via `c.service(ServiceCtor)`.
   */
  public services: Array<new () => ServiceLifecycle> = [];

  /**
   * Declare validators required by this route.
   * These validators are executed before services/hooks/handle,
   * and their returned values are available via `c.validated(ValidatorCtor)`.
   */
  public validators: Array<new () => TypeValidator<any>> = [];

  onMount(): void {}

  /**
   * Optional custom validation hook (still supported),
   * but *data plumbing* is standardized through `validators = [...]`.
   */
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
// --- END FILE ---
