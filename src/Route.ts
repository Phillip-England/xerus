import type { HTTPHandlerFunc, HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Middleware } from "./Middleware";
import { HTTPContext, type Constructable } from "./HTTPContext";
import { Validator } from "./Validator";
import { Source, type ValidationConfig } from "./ValidationSource";
import type { TypeValidator } from "./TypeValidator";

/**
 * Route
 * - HTTP Route with middleware + optional granular error handler
 *
 * New:
 * - route.validate(Class, Source.*) adds validation middleware automatically
 *   (inserted at the FRONT of the middleware list)
 */
export class Route {
  public method: string;
  public path: string;
  public handler: HTTPHandlerFunc;
  public middlewares: Middleware<HTTPContext>[] = [];
  public errHandler?: HTTPErrorHandlerFunc;

  constructor(method: string, path: string, handler: HTTPHandlerFunc) {
    this.method = method.toUpperCase();
    this.path = path;
    this.handler = handler;
  }

  use(...middlewares: Middleware<HTTPContext>[]) {
    this.middlewares.push(...middlewares);
    return this;
  }

  onErr(handler: HTTPErrorHandlerFunc) {
    this.errHandler = handler;
    return this;
  }

  // -----------------------------
  // Validation
  // -----------------------------

  /**
   * Generic validation hook.
   * Adds the validator middleware "behind the scenes" without you needing to pass
   * Validator(...) into .use(...).
   *
   * IMPORTANT: This is inserted at the FRONT of the middleware list, so validation
   * happens before any other middleware/handler logic by default.
   */
  validate<T extends TypeValidator>(Class: Constructable<T>, config: ValidationConfig) {
    this.middlewares.unshift(Validator(Class, config));
    return this;
  }

  // --- Convenience helpers (backwards compatible) ---

  validateJSON<T extends TypeValidator>(Class: Constructable<T>) {
    return this.validate(Class, Source.JSON);
  }

  validateForm<T extends TypeValidator>(Class: Constructable<T>) {
    return this.validate(Class, Source.FORM);
  }

  validateMultipart<T extends TypeValidator>(Class: Constructable<T>) {
    return this.validate(Class, Source.MULTIPART);
  }

  validateQuery<T extends TypeValidator>(Class: Constructable<T>) {
    return this.validate(Class, Source.QUERY());
  }

  validateParam<T extends TypeValidator>(paramName: string, Class: Constructable<T>) {
    return this.validate(Class, Source.PARAM(paramName));
  }

  /**
   * Optional helper for header validation (symmetry with flexible Source.HEADER)
   */
  validateHeader<T extends TypeValidator>(headerName: string, Class: Constructable<T>) {
    return this.validate(Class, Source.HEADER(headerName));
  }
}
