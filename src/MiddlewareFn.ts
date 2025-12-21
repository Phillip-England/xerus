// PATH: /home/jacex/src/xerus/src/MiddlewareFn.ts
import type { MiddlewareNextFn } from "./MiddlewareNextFn";
import { HTTPContext } from "./HTTPContext";

// C is the specific HTTPContext<T>
export type MiddlewareFn<C extends HTTPContext<any>> = (
  c: C,
  next: MiddlewareNextFn,
) => Promise<void>;