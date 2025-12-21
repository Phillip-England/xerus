import { WSHandler } from "./WSHandler";
import { Middleware } from "./Middleware";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { WSOpenFunc, WSMessageFunc, WSCloseFunc, WSDrainFunc } from "./WSHandlerFuncs";
import type { HTTPContext } from "./HTTPContext";
import type { WSContext } from "./WSContext";
import { SourceType, type WSValidationSource } from "./ValidationSource";
import { Validator, type ValidateWithValidatorFn } from "./Validator";

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

function inferOutKeyFromWSSource(source: WSValidationSource): string {
  switch (source.type) {
    case SourceType.PARAM:
    case SourceType.HEADER:
      return source.key;
    case SourceType.QUERY:
      return source.key ? source.key : "query";
    case SourceType.WS_MESSAGE:
      return "message";
    case SourceType.WS_CLOSE:
      return "close";
    case SourceType.JSON:
    case SourceType.FORM:
    case SourceType.MULTIPART:
    case SourceType.TEXT:
      return "data";
    default:
      return "data";
  }
}

function pipeWSValidatorObject(...fns: ValidateWithValidatorFn<WSContext>[]) {
  if (fns.length === 0) {
    throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "WS validator requires at least one function");
  }
  return async (c: WSContext, initial: any) => {
    let current = initial;
    for (const fn of fns) {
      const v = new Validator(current);
      const ret = await fn(c, v);
      if (ret instanceof Validator) current = ret.value;
      else if (ret === undefined) current = v.value;
      else current = ret;
    }
    return current;
  };
}

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

  validate(
    source: WSValidationSource,
    outKey: string,
    ...fns: ValidateWithValidatorFn<WSContext>[]
  ): this;
  validate(
    source: WSValidationSource,
    ...fns: ValidateWithValidatorFn<WSContext>[]
  ): this;

  validate(source: WSValidationSource, arg2: any, ...rest: any[]) {
    let outKey: string;
    let fns: ValidateWithValidatorFn<WSContext>[];

    if (typeof arg2 === "string") {
      outKey = arg2;
      fns = rest as ValidateWithValidatorFn<WSContext>[];
    } else {
      outKey = inferOutKeyFromWSSource(source);
      fns = [arg2, ...rest] as ValidateWithValidatorFn<WSContext>[];
    }

    if (fns.length === 0) {
      throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "WSRoute.validate requires at least one function");
    }

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

    const composed = pipeWSValidatorObject(...fns);
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
