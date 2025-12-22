import type { HTTPContext } from "./HTTPContext";

export interface TypeValidator<TRaw = unknown> {
  validate(c: HTTPContext): Promise<void>;
}
