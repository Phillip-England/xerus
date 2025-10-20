import { HTTPContext } from "./HTTPContext";
import type { MiddlewareNextFn } from "./MiddlewareNextFn";

export type MiddlewareFn = (
  c: HTTPContext,
  next: MiddlewareNextFn,
) => Promise<void | Response>;



//===