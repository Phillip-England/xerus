// --- START FILE: src/XerusRoute.ts ---
import { HTTPContext } from "./HTTPContext";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Method } from "./Method";
import type { TypeValidator } from "./TypeValidator";

/**
 * Services are now "any constructor" globally.
 *
 * Reason:
 * - ServiceLifecycle is a "weak type" (all optional keys).
 * - TypeScript requires some shared keys when assigning class instances to weak types.
 * - WS routes often use lightweight per-message services without lifecycle keys,
 *   so typing them as ServiceLifecycle creates false-negative TS errors.
 *
 * Runtime already treats hooks as optional:
 *   if (svc.before) await svc.before(c)
 */
export type AnyServiceCtor = new () => any;
export type AnyValidatorCtor = new () => TypeValidator<any>;

export abstract class XerusRoute {
  abstract method: Method;
  abstract path: string;

  public _errHandler?: HTTPErrorHandlerFunc;

  // ✅ Unified: HTTP + WS both use ctor lists
  public services: AnyServiceCtor[] = [];
  public validators: AnyValidatorCtor[] = [];

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
// --- END FILE ---
