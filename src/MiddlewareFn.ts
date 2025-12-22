import type { MiddlewareNextFn } from "./MiddlewareNextFn";
import type { HTTPContext } from "./HTTPContext";

export type AnyContext<T extends Record<string, any> = Record<string, any>> =
  HTTPContext<T>;

export type MiddlewareFn<T extends Record<string, any> = Record<string, any>> =
  (
    c: AnyContext<T>,
    next: MiddlewareNextFn,
  ) => Promise<void>;
