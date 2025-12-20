// PATH: /home/jacex/src/xerus/src/Route.ts

import type { HTTPHandlerFunc, HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import { HTTPValidator, type ValidateFn } from "./Validator";
import type { HTTPValidationSource } from "./ValidationSource";

/**
 * Route
 * - HTTP Route with middleware + optional granular error handler
 *
 * Validation:
 *   route.validate(Source.QUERY("page"), "page", v.required(), v.asInt(), v.min(1))
 *   data.get("page") -> validated result
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

  /**
   * validate(source, outKey, ...fns)
   *
   * - source: typed discriminated union (HTTP only)
   * - outKey: where the validated value will be stored in ValidatedData
   * - fns: one or more validator/transform functions:
   *        (c, value) => nextValue
   *
   * Example:
   *   route.validate(Source.QUERY("page"), "page", v.required(), v.asInt(), v.min(1))
   */
  validate(
    source: HTTPValidationSource,
    outKey: string,
    ...fns: ValidateFn<HTTPContext, any, any>[]
  ) {
    // inserted at the FRONT so it runs before other middleware
    this.middlewares.unshift(HTTPValidator(source, outKey, ...fns));
    return this;
  }
}
