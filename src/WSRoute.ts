// PATH: /home/jacex/src/xerus/src/WSRoute.ts

import { WSHandler } from "./WSHandler";
import { Middleware } from "./Middleware";
import type { Constructable } from "./HTTPContext";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Validator } from "./Validator";
import type { ValidationConfig } from "./ValidationSource";
import type { TypeValidator } from "./TypeValidator";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { WSOpenFunc, WSMessageFunc, WSCloseFunc, WSDrainFunc } from "./WSHandlerFuncs";
import type { HTTPContext } from "./HTTPContext";

export enum WSMethod {
  OPEN = "OPEN",
  MESSAGE = "MESSAGE",
  CLOSE = "CLOSE",
  DRAIN = "DRAIN",
}

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
   * Generic validation hook for WebSockets too:
   * wsRoute.validate(MyValidator, Source.WS_MESSAGE)
   */
  validate<T extends TypeValidator>(Class: Constructable<T>, config: ValidationConfig) {
    // Enforce correct lifecycle usage
    if (config.target === "WS_MESSAGE" && this.method !== WSMethod.MESSAGE) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        "Source.WS_MESSAGE validation can only be used on WSMethod.MESSAGE routes",
      );
    }
    if (config.target === "WS_CLOSE" && this.method !== WSMethod.CLOSE) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        "Source.WS_CLOSE validation can only be used on WSMethod.CLOSE routes",
      );
    }

    this.middlewares.unshift(Validator(Class, config));
    return this;
  }

  // --- Compilation ---

  compile(): WSHandler {
    const h = new WSHandler();

    switch (this.method) {
      case WSMethod.OPEN:
        h.setOpen(this.handler as WSOpenFunc, this.middlewares, this.errHandler);
        break;
      case WSMethod.MESSAGE:
        h.setMessage(this.handler as WSMessageFunc, this.middlewares, this.errHandler);
        break;
      case WSMethod.CLOSE:
        h.setClose(this.handler as WSCloseFunc, this.middlewares, this.errHandler);
        break;
      case WSMethod.DRAIN:
        h.setDrain(this.handler as WSDrainFunc, this.middlewares, this.errHandler);
        break;
      default:
        throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Unknown WSMethod");
    }

    return h;
  }
}
