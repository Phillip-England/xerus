// PATH: /home/jacex/src/xerus/src/Route.ts

import type { HTTPHandlerFunc, HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import { HTTPValidator } from "./Validator";
import { Source } from "./ValidationSource";

/**
 * Route
 * - HTTP Route with middleware + optional granular error handler
 *
 * Validation:
 *   route.validate(Source.QUERY, "page", "page", (c, raw) => ...)
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
   * validate(source, sourceKey, outKey, fn)
   *
   * - sourceKey: used for QUERY/PARAM/HEADER (ignored for JSON/FORM/MULTIPART/TEXT unless you want it for QUERY)
   * - outKey: where the validated value will be stored in ValidatedData
   */
  validate(
    source: Source,
    sourceKey: string,
    outKey: string,
    fn: (c: HTTPContext, raw: any) => any | Promise<any>,
  ) {
    // inserted at the FRONT so it runs before other middleware
    this.middlewares.unshift(HTTPValidator(source, sourceKey, outKey, fn));
    return this;
  }
}
