// --- START FILE: src/Validator.ts ---
import type { TypeValidator } from "./TypeValidator";

/**
 * @deprecated
 * This API is intentionally disabled to enforce the new UX:
 *
 *   class MyRoute extends XerusRoute {
 *     validators = [MyValidator]
 *   }
 *
 * Validators are now ctor-based and run by Xerus automatically.
 */
export class Validator {
  static Ctx<T extends TypeValidator<any>>(
    _Type: new () => T,
    _storeKey?: string,
  ): never {
    throw new Error(
      `[XERUS] Validator.Ctx() has been removed.\n` +
        `Use: validators = [MyValidatorCtor]\n` +
        `Then read via: c.validated(MyValidatorCtor)`,
    );
  }
}

/**
 * @deprecated
 * Same as Validator.Ctx(). Disabled to enforce the new UX.
 */
export function Validate<T extends TypeValidator<any>>(
  _Type: new () => T,
  _storeKey?: string,
): never {
  throw new Error(
    `[XERUS] Validate() has been removed.\n` +
      `Use: validators = [MyValidatorCtor]\n` +
      `Then read via: c.validated(MyValidatorCtor)`,
  );
}
// --- END FILE ---
