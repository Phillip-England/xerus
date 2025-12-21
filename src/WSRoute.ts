import { WSHandler, type WSClassValidation } from "./WSHandler";
import { Middleware } from "./Middleware";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { WSOpenFunc, WSMessageFunc, WSCloseFunc, WSDrainFunc } from "./WSHandlerFuncs";
import type { HTTPContext } from "./HTTPContext";
import type { Constructable } from "./HTTPContext";
import { SourceType, type WSValidationSource } from "./ValidationSource";

export enum WSMethod {
  OPEN = "OPEN",
  MESSAGE = "MESSAGE",
  CLOSE = "CLOSE",
  DRAIN = "DRAIN",
}

function isConstructable(v: any): v is Constructable<any> {
  return typeof v === "function";
}

export class WSRoute {
  public method: WSMethod;
  public path: string;
  public handler: WSOpenFunc | WSMessageFunc | WSCloseFunc | WSDrainFunc;
  public middlewares: Middleware<HTTPContext>[] = [];
  public errHandler?: HTTPErrorHandlerFunc;

  private validations: WSClassValidation[] = [];

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
   * ✅ Single validation style for WS:
   *   wsRoute.validate(Source.WS_MESSAGE(), MyMessage)
   *   const msg = data.get(MyMessage)
   */
  validate<T extends object>(source: WSValidationSource, ctor: Constructable<T>): this {
    if (!isConstructable(ctor)) {
      throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "WSRoute.validate requires a constructable class");
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

    this.validations.push({ source, ctor });
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
