import type { HTTPHandlerFunc, HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import type { Constructable } from "./HTTPContext";
import { HTTPTypeValidator } from "./Validator";
import type { HTTPValidationSource } from "./ValidationSource";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";

function isConstructable(v: any): v is Constructable<any> {
  return typeof v === "function";
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

  /**
   * ✅ Single validation style:
   *   route.validate(Source.JSON(), MyBody)
   *   const body = data.get(MyBody)
   */
  validate<T extends object>(source: HTTPValidationSource, ctor: Constructable<T>): this {
    if (!isConstructable(ctor)) {
      throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Route.validate requires a constructable class");
    }
    this.middlewares.unshift(HTTPTypeValidator(source, ctor));
    return this;
  }
}
