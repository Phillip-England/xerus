// --- START FILE: src/TypeValidator.ts ---
import type { HTTPContext } from "./HTTPContext";

/**
 * Validators must return a value.
 * That returned value is what gets stored and later accessed via `c.validated(Type)`.
 */
export interface TypeValidator<TOut = any> {
  validate(c: HTTPContext): Promise<TOut> | TOut;
}
// --- END FILE ---
