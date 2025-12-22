import type { HTTPContext } from "./HTTPContext";
import type { ValidationSource } from "./ValidationSource";
import type { TypeValidator } from "./TypeValidator";

type Ctor<T> = new (...args: any[]) => T;
const XERUS_FIELD = Symbol.for("xerus:routefield");

export type RouteFieldKind = "validator" | "validator_ctx" | "inject";
export type AnyRouteField =
  | RouteFieldValidator<any, any>
  | RouteFieldValidatorCtx<any>
  | RouteFieldInject<any>;

export interface InjectableStore {
  storeKey?: string;
  init?(c: HTTPContext): Promise<void>;
}

export class RouteFieldValidator<TRaw, T extends TypeValidator<TRaw> = any> {
  readonly kind = "validator" as const;
  readonly [XERUS_FIELD] = true as const;
  readonly source: ValidationSource<TRaw>;
  readonly Type: new (raw: TRaw) => T;
  readonly storeKey?: string;

  constructor(
    source: ValidationSource<TRaw>,
    Type: new (raw: TRaw) => T,
    storeKey?: string,
  ) {
    this.source = source;
    this.Type = Type;
    this.storeKey = storeKey;
  }
}

export class RouteFieldValidatorCtx<T extends TypeValidator<void> = any> {
  readonly kind = "validator_ctx" as const;
  readonly [XERUS_FIELD] = true as const;
  readonly Type: new () => T;
  readonly storeKey?: string;

  constructor(Type: new () => T, storeKey?: string) {
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

export function isRouteFieldValidator(
  x: any,
): x is RouteFieldValidator<any, any> {
  return isRouteField(x) && x.kind === "validator";
}

export function isRouteFieldValidatorCtx(
  x: any,
): x is RouteFieldValidatorCtx<any> {
  return isRouteField(x) && x.kind === "validator_ctx";
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
