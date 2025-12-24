// src/RouteFields.ts
import type { HTTPContext } from "./HTTPContext";
import type { TypeValidator } from "./TypeValidator";

type Ctor<T> = new (...args: any[]) => T;

const XERUS_FIELD = Symbol.for("xerus:routefield");

export type RouteFieldKind = "validator" | "inject";

export type AnyRouteField =
  | RouteFieldValidator<any>
  | RouteFieldInject<any>;

// This is now the replacement for Middleware
export interface ServiceLifecycle {
  storeKey?: string;
  // Runs immediately when resolved/instantiated
  init?(c: HTTPContext): Promise<void>; 
  // Runs before the route handler
  before?(c: HTTPContext): Promise<void>;
  // Runs after the route handler (success only)
  after?(c: HTTPContext): Promise<void>;
  // Runs if an error is thrown during handling
  onError?(c: HTTPContext, err: unknown): Promise<void>; 
}

export type InjectableStore = ServiceLifecycle; // Alias for backward compat

export class RouteFieldValidator<T extends TypeValidator = any> {
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

export function Inject<T extends InjectableStore = any>(
  Type: Ctor<T>,
  storeKey?: string,
): T {
  return new RouteFieldInject(Type, storeKey) as unknown as T;
}