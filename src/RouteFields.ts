import type { HTTPContext } from "./HTTPContext";
import type { ValidationSource } from "./ValidationSource";
import type { TypeValidator } from "./TypeValidator";
import { Validator } from "./Validator";
import { Middleware } from "./Middleware";

type Ctor<T> = new (...args: any[]) => T;

const XERUS_FIELD = Symbol.for("xerus:routefield");

export type RouteFieldKind = "validator" | "inject";
export type AnyRouteField = RouteFieldValidator<any> | RouteFieldInject<any>;

export interface InjectableStore {
  storeKey?: string;
  init?(c: HTTPContext<any>): Promise<void>;
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

  toMiddleware(routeInstance: any, prop: string): Middleware<any> {
    const v = new Validator(this.source, this.Type, this.storeKey ?? prop);
    return new Middleware<any>(async (c: HTTPContext<any>, next) => {
      await v.asMiddleware().execute(c, async () => {});
      const instance = (c.data as any)[v.storeKey];

      // THIS IS WHERE THE RUNTIME REPLACEMENT HAPPENS
      (routeInstance as any)[prop] = instance;

      await next();
    });
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

  toMiddleware(routeInstance: any, prop: string): Middleware<any> {
    const Type = this.Type;
    return new Middleware<any>(async (c: HTTPContext<any>, next) => {
      const instance: any = new Type();
      const key = this.storeKey ??
        instance?.storeKey ??
        Type?.name ??
        prop;

      if (instance && typeof instance.init === "function") {
        await instance.init(c);
      }

      c.setStore(key, instance);

      // THIS IS WHERE THE RUNTIME REPLACEMENT HAPPENS
      (routeInstance as any)[prop] = instance;

      await next();
    });
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

// FIXED: Return type changed from RouteFieldInject<T> to T
export function Inject<T extends InjectableStore = any>(
  Type: Ctor<T>,
  storeKey?: string,
): T {
  return new RouteFieldInject(Type, storeKey) as unknown as T;
}
