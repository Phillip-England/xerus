import { RouteFieldValidator } from "./RouteFields";
import type { TypeValidator } from "./TypeValidator";

export class Validator {
  /**
   * Registers a Validator class to be injected into the route.
   * The Validator class must implement `TypeValidator` and define a `validate(c)` method.
   *
   * @param Type The class constructor
   * @param storeKey Optional key to store the instance in c.data (defaults to Class Name)
   */
  static Ctx<T extends TypeValidator>(
    Type: new () => T,
    storeKey?: string,
  ): T {
    return new RouteFieldValidator(Type, storeKey) as unknown as T;
  }
}
