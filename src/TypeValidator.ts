import type { HTTPContext } from "./HTTPContext";

export interface TypeValidator {

  /**
   * Run validation logic.
   * Should throw an error if validation fails.
   * @param c The HTTPContext, allowing validation logic to access headers, IP, etc.
   */
  validate(c: HTTPContext): void | Promise<void>;
}