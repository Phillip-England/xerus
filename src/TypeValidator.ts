export interface TypeValidator {
  /**
   * Run validation logic.
   * Should throw an error if validation fails.
   */
  validate(): void | Promise<void>;
}