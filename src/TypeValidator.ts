import type { HTTPContext } from "./HTTPContext";
import type { WSContext } from "./WSContext";

/**
 * Generic, class-based validator contract.
 * Implement with a specific context type for ergonomic usage:
 *   class MyBody implements TypeValidator<HTTPContext> { ... }
 *   class MyMsg  implements TypeValidator<WSContext>   { ... }
 */
export interface TypeValidator<C = HTTPContext | WSContext> {
  validate(c: C): void | Promise<void>;
}
