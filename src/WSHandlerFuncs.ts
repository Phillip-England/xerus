import type { HTTPContext } from "./HTTPContext";

/**
 * WebSocket handlers now receive the same HTTPContext as regular HTTP routes.
 * Access the WSContext via `c.ws()`.
 */
export type WSOpenFunc<T extends Record<string, any> = Record<string, any>> = (
  c: HTTPContext<T>,
) => Promise<void>;
export type WSMessageFunc<T extends Record<string, any> = Record<string, any>> =
  (c: HTTPContext<T>) => Promise<void>;
export type WSDrainFunc<T extends Record<string, any> = Record<string, any>> = (
  c: HTTPContext<T>,
) => Promise<void>;
export type WSCloseFunc<T extends Record<string, any> = Record<string, any>> = (
  c: HTTPContext<T>,
) => Promise<void>;
