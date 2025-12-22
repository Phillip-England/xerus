import type { HTTPContext } from "./HTTPContext";

export interface TypeValidator {
  validate(c: HTTPContext): Promise<void>;
}
