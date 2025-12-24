import type { HTTPContext } from "./HTTPContext";

type Ctor<T> = new (...args: any[]) => T;

const XERUS_FIELD = Symbol.for("xerus:routefield");

export type RouteFieldKind = "validator" | "inject";

export type AnyRouteField = RouteFieldValidator<any> | RouteFieldInject<any>;

/**
 * Lifecycle for "Services" (your replacement for middleware).
 *
 * - init(c): per-request initialization
 * - initApp(app): app/singleton initialization (used by app.injectGlobal())
 * - before/after: run around route execution (like middleware onion but typed services)
 * - onError: error hook
 */
export interface ServiceLifecycle {
  storeKey?: string;

  /** Per-request init (called when resolved for a specific HTTPContext). */
  init?(c: HTTPContext): Promise<void>;

  /** App-level init (called once when injected globally/singleton). */
  initApp?(app: any): Promise<void>; // `any` avoids circular import; Xerus calls it.

  before?(c: HTTPContext): Promise<void>;
  after?(c: HTTPContext): Promise<void>;
  onError?(c: HTTPContext, err: unknown): Promise<void>;
}

export type InjectableStore = ServiceLifecycle; // Alias for backward compat

export class RouteFieldValidator<T extends { validate(c: HTTPContext): Promise<void> } = any> {
  readonly kind = "validator" as const;
  readonly [XERUS_FIELD] = true as const;
  readonly Type: new () => T;
  readonly storeKey?: string;

  constructor(Type: new () => T, storeKey?: string) {
    this.Type = Type;
    this.storeKey = storeKey;
  }
}

export class RouteFieldInject<T extends InjectableStore = any> {
  readonly kind = "inject" as const;
  readonly [XERUS_FIELD] = true as const;
  readonly Type: Ctor<T>;
  readonly storeKey?: string;

  constructor(Type: Ctor<T>, storeKey?: string) {
    this.Type = Type;
    this.storeKey = storeKey;
  }
}

export function isRouteField(x: any): x is AnyRouteField {
  return !!x && typeof x === "object" && x[XERUS_FIELD] === true;
}

export function isRouteFieldValidator(x: any): x is RouteFieldValidator<any> {
  return isRouteField(x) && x.kind === "validator";
}

export function isRouteFieldInject(x: any): x is RouteFieldInject<any> {
  return isRouteField(x) && x.kind === "inject";
}

/**
 * Inject a service instance into a class field.
 *
 * Usage:
 *   class MyRoute extends XerusRoute {
 *     logger = Inject(LoggerService)
 *   }
 */
export function Inject<T extends InjectableStore = any>(
  Type: Ctor<T>,
  storeKey?: string,
): T {
  return new RouteFieldInject(Type, storeKey) as unknown as T;
}
