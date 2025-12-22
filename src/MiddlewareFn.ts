import type { MiddlewareNextFn } from "./MiddlewareNextFn";
import type { HTTPContext } from "./HTTPContext";

// REMOVED: <T>
export type AnyContext = HTTPContext;

// REMOVED: <T>
export type MiddlewareFn = (
  c: AnyContext,
  next: MiddlewareNextFn,
) => Promise<void>;