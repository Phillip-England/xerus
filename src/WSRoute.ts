// PATH: /home/jacex/src/xerus/src/WSRoute.ts

import { WSHandler } from "./WSHandler";
import { Middleware } from "./Middleware";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { WSOpenFunc, WSMessageFunc, WSCloseFunc, WSDrainFunc } from "./WSHandlerFuncs";
import type { HTTPContext } from "./HTTPContext";
import type { WSContext } from "./WSContext";
import { SourceType, type WSValidationSource } from "./ValidationSource";
import { pipeValidators, type ValidateFn } from "./Validator";

export enum WSMethod {
  OPEN = "OPEN",
  MESSAGE = "MESSAGE",
  CLOSE = "CLOSE",
  DRAIN = "DRAIN",
}

export type WSValidation = {
  source: WSValidationSource;
  outKey: string;
  fn: (c: WSContext, raw: any) => any | Promise<any>;
};

/**
 * WSRoute: One route == one websocket lifecycle method.
 * Multiple WSRoute entries can share the same `path` and will be merged at mount-time.
 */
export class WSRoute {
  public method: WSMethod;
  public path: string;

  public handler: WSOpenFunc | WSMessageFunc | WSCloseFunc | WSDrainFunc;
  public middlewares: Middleware<HTTPContext>[] = [];
  public errHandler?: HTTPErrorHandlerFunc;

  private validations: WSValidation[] = [];

  constructor(
    method: WSMethod,
    path: string,
    handler: WSOpenFunc | WSMessageFunc | WSCloseFunc | WSDrainFunc,
  ) {
    this.method = method;
    this.path = path;
    this.handler = handler;
  }

  use(...mw: Middleware<HTTPContext>[]) {
    this.middlewares.push(...mw);
    return this;
  }

  onErr(handler: HTTPErrorHandlerFunc) {
    this.errHandler = handler;
    return this;
  }

  /**
   * validate(source, outKey, ...fns)
   * - Runs before handler, inside WSHandler, with a real WSContext.
   * - Stores validated value at data.get(outKey)
   *
   * Example:
   *   wsRoute.validate(Source.WS_MESSAGE(), "msg", v.required(), v.asString(), v.maxLength(1000))
   */
  validate(
    source: WSValidationSource,
    outKey: string,
    ...fns: ValidateFn<WSContext, any, any>[]
  ) {
    if (fns.length === 0) {
      throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "WSRoute.validate requires at least one function");
    }

    // enforce lifecycle correctness for WS_MESSAGE / WS_CLOSE (runtime)
    if (source.type === SourceType.WS_MESSAGE && this.method !== WSMethod.MESSAGE) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        "Source.WS_MESSAGE() validation can only be used on WSMethod.MESSAGE routes",
      );
    }
    if (source.type === SourceType.WS_CLOSE && this.method !== WSMethod.CLOSE) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        "Source.WS_CLOSE() validation can only be used on WSMethod.CLOSE routes",
      );
    }

    const composed = pipeValidators<WSContext>(...fns);
    this.validations.push({ source, outKey, fn: composed });
    return this;
  }

  compile(): WSHandler {
    const h = new WSHandler();

    switch (this.method) {
      case WSMethod.OPEN:
        h.setOpen(this.handler as WSOpenFunc, this.middlewares, this.errHandler, this.validations);
        break;
      case WSMethod.MESSAGE:
        h.setMessage(this.handler as WSMessageFunc, this.middlewares, this.errHandler, this.validations);
        break;
      case WSMethod.CLOSE:
        h.setClose(this.handler as WSCloseFunc, this.middlewares, this.errHandler, this.validations);
        break;
      case WSMethod.DRAIN:
        h.setDrain(this.handler as WSDrainFunc, this.middlewares, this.errHandler, this.validations);
        break;
      default:
        throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Unknown WSMethod");
    }

    return h;
  }
}
