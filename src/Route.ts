import type { HTTPHandlerFunc, HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import { HTTPValidator, type ValidateWithValidatorFn } from "./Validator";
import type { HTTPValidationSource } from "./ValidationSource";
import { SourceType } from "./ValidationSource";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";

/**
 * Infer validated output key.
 * If the source already has a key (QUERY/PARAM/HEADER), that wins.
 */
function inferOutKey(source: HTTPValidationSource): string {
  switch (source.type) {
    case SourceType.PARAM:
    case SourceType.HEADER:
      return source.key;

    case SourceType.QUERY:
      return source.key ?? "query";

    case SourceType.JSON:
      return "json";

    case SourceType.FORM:
      return "form";

    case SourceType.MULTIPART:
      return "multipart";

    case SourceType.TEXT:
      return "text";

    default:
      throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Cannot infer outKey from source");
  }
}

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

  // Overloads for nicer typing
  validate(
    source: HTTPValidationSource,
    ...fns: ValidateWithValidatorFn<HTTPContext>[]
  ): this;
  validate(
    source: HTTPValidationSource,
    outKey: string,
    ...fns: ValidateWithValidatorFn<HTTPContext>[]
  ): this;

  validate(source: HTTPValidationSource, arg2: any, ...rest: any[]): this {
    let outKey: string;
    let fns: ValidateWithValidatorFn<HTTPContext>[];

    // route.validate(source, "key", fn1, fn2...)
    if (typeof arg2 === "string") {
      outKey = arg2;
      fns = rest as ValidateWithValidatorFn<HTTPContext>[];
    }
    // route.validate(source, fn1, fn2...)
    else {
      outKey = inferOutKey(source);
      fns = [arg2, ...rest] as ValidateWithValidatorFn<HTTPContext>[];
    }

    if (!outKey) {
      throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Validation output key could not be determined");
    }

    if (!fns || fns.length === 0) {
      throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Route.validate requires at least one validation function");
    }

    // ✅ IMPORTANT: spread functions, do NOT pass the array as a single arg
    this.middlewares.unshift(HTTPValidator(source, outKey, ...fns));

    return this;
  }
}
