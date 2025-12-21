import type { MiddlewareNextFn } from "./MiddlewareNextFn";
import { HTTPContext } from "./HTTPContext";

export type MiddlewareFn<T extends Record<string, any> = Record<string, any>> = (
  c: HTTPContext<T>,
  next: MiddlewareNextFn,
) => Promise<void>;
