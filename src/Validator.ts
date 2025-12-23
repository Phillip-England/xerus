// --- START FILE: src/Validator.ts ---
import { RouteFieldValidator } from "./RouteFields";
import type { TypeValidator } from "./TypeValidator";

export class Validator {
  static Ctx<T extends TypeValidator>(
    Type: new () => T,
    storeKey?: string,
  ): T {
    return new RouteFieldValidator(Type, storeKey) as unknown as T;
  }
}
// --- END FILE: src/Validator.ts ---
