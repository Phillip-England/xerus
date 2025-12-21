import type { HTTPContext } from "./HTTPContext";
import type { WSContext } from "./WSContext";

export interface TypeValidator {
  validate(c: HTTPContext | WSContext): Promise<void>;
}