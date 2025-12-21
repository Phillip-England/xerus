// PATH: /Users/phillipengland/src/xerus/src/TypeValidator.ts

import type { HTTPContext } from "./HTTPContext";

/**
 * Any type can be "validatable" by Xerus by implementing this.
 * It may throw if invalid.
 */
export interface TypeValidator {
  validate(c: HTTPContext): Promise<void>;
}
