import type { MiddlewareNextFn } from "./MiddlewareNextFn";

export type MiddlewareFn<C> = (
  c: C,
  next: MiddlewareNextFn,
) => Promise<void>;