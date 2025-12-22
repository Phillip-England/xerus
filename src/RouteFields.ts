import type { HTTPContext } from "./HTTPContext";
import type { ValidationSource } from "./ValidationSource";
import type { TypeValidator } from "./TypeValidator";

type Ctor<T> = new (...args: any[]) => T;

const XERUS_FIELD = Symbol.for("xerus:routefield");

export type RouteFieldKind = "validator" | "inject";
export type AnyRouteField = RouteFieldValidator<any> | RouteFieldInject<any>;

export interface InjectableStore {
  storeKey?: string;
  // CHANGED: Removed <any>
  init?(c: HTTPContext): Promise<void>;
}

export class RouteFieldValidator<T extends TypeValidator = any> {
  readonly kind: RouteFieldKind = "validator";
  readonly [XERUS_FIELD] = true as const;
  readonly source: ValidationSource;
  readonly Type: new (raw: any) => T;
  readonly storeKey?: string;

  constructor(
    source: ValidationSource,
    Type: new (raw: any) => T,
    storeKey?: string,
  ) {
    this.source = source;
    this.Type = Type;
    this.storeKey = storeKey;
  }
}

export class RouteFieldInject<T extends InjectableStore = any> {
  readonly kind: RouteFieldKind = "inject";
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