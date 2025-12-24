// --- START FILE: src/RouteFields.ts ---
import type { HTTPContext } from "./HTTPContext";

type Ctor<T> = new (...args: any[]) => T;

const XERUS_FIELD = Symbol.for("xerus:routefield");

/**
 * Lifecycle interface for services.
 * (Kept for compatibility + typing.)
 */
export interface ServiceLifecycle {
  storeKey?: string;
  init?(c: HTTPContext): Promise<void>;
  initApp?(app: any): Promise<void>; // `any` avoids circular import; Xerus calls it.
  before?(c: HTTPContext): Promise<void>;
  after?(c: HTTPContext): Promise<void>;
  onError?(c: HTTPContext, err: unknown): Promise<void>;
}

export type InjectableStore = ServiceLifecycle; // Alias for backward compat

/**
 * @deprecated Legacy RouteField classes are kept only so old code errors clearly.
 * Xerus no longer supports RouteField-based injection/validation.
 */
export type RouteFieldKind = "validator" | "inject";
export type AnyRouteField = RouteFieldValidator<any> | RouteFieldInject<any>;

export class RouteFieldValidator<T extends { validate(c: HTTPContext): Promise<any> | any } = any> {
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
 * @deprecated Disabled to enforce the new UX:
 *
 *   services = [UserService, MetricsService]
 *
 * If you need a service, declare it in `services` and then call `c.service(Type)`.
 */
export function Inject<T extends InjectableStore = any>(
  _Type: Ctor<T>,
  _storeKey?: string,
): never {
  throw new Error(
    `[XERUS] Inject() has been removed.\n` +
      `Use: services = [MyServiceCtor]\n` +
      `Then read via: c.service(MyServiceCtor)`,
  );
}
// --- END FILE ---
