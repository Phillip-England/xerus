// PATH: /home/jacex/src/xerus/src/WSRoute.ts

import type { ServerWebSocket } from "bun";
import { WSHandler } from "./WSHandler";
import { Middleware } from "./Middleware";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { WSOpenFunc, WSMessageFunc, WSCloseFunc, WSDrainFunc } from "./WSHandlerFuncs";
import type { HTTPContext } from "./HTTPContext";
import type { Constructable } from "./HTTPContext";
import { SourceType, type WSValidationSource } from "./ValidationSource";
import type { TypeValidator } from "./TypeValidator";
import { WSContext } from "./WSContext";
import type { ValidatedData } from "./ValidatedData";

export enum WSMethod {
  OPEN = "OPEN",
  MESSAGE = "MESSAGE",
  CLOSE = "CLOSE",
  DRAIN = "DRAIN",
}

function isConstructable(v: any): v is Constructable<any> {
  return typeof v === "function";
}

function extractWSRawFromHTTP(http: HTTPContext, source: WSValidationSource) {
  switch (source.type) {
    case SourceType.QUERY:
      return source.key ? http.query(source.key, "") : http.queries;
    case SourceType.PARAM:
      return http.getParam(source.key, "");
    case SourceType.HEADER:
      return http.getHeader(source.key);
    case SourceType.WS_MESSAGE: {
      const msg = http._wsMessage;
      if (Buffer.isBuffer(msg)) return msg.toString();
      return msg ?? "";
    }
    case SourceType.WS_CLOSE: {
      const closeArgs = http.getStore("_wsCloseArgs") as { code: number; reason: string } | undefined;
      return { code: closeArgs?.code ?? 0, reason: closeArgs?.reason ?? "" };
    }
    case SourceType.JSON:
    case SourceType.FORM:
    case SourceType.MULTIPART:
    case SourceType.TEXT:
      throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, `${source.type} is not supported for WS validation`);
    default:
      throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Unknown validation source");
  }
}

function ensureWSValidated(http: HTTPContext): ValidatedData {
  const vd = http.getStore("__wsValidated") as ValidatedData | undefined;
  if (vd) return vd;

  // Fallback: create one using same class as http.validated (keeps your impl flexible)
  const created = new (http.validated.constructor as any)() as ValidatedData;
  http.setStore("__wsValidated", created);
  return created;
}

function WSTypeValidator<T extends object>(source: WSValidationSource, Ctor: Constructable<T>) {
  return new Middleware<HTTPContext>(async (http, next) => {
    const ws = http.getStore("__wsSocket") as ServerWebSocket<HTTPContext> | undefined;

    // If somehow run outside WS, we fail loudly (developer error)
    if (!ws) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        "WS validation middleware ran without an active WebSocket. (Missing __wsSocket)",
      );
    }

    const vd = ensureWSValidated(http);

    // Build WSContext view for validate(c)
    const closeArgs = http.getStore("_wsCloseArgs") as { code: number; reason: string } | undefined;

    const c = new WSContext(ws, http, {
      message: (http._wsMessage ?? "") as any,
      code: closeArgs?.code ?? 0,
      reason: closeArgs?.reason ?? "",
      data: vd,
    });

    let raw: any;
    try {
      raw = extractWSRawFromHTTP(http, source);
    } catch (e: any) {
      throw new SystemErr(
        SystemErrCode.BODY_PARSING_FAILED,
        `Data Extraction Failed: ${e?.message ?? String(e)}`,
      );
    }

    try {
      const instance: any = new (Ctor as any)(raw);
      const maybeValidate = (instance as TypeValidator<WSContext> | undefined)?.validate;
      if (typeof maybeValidate === "function") {
        await maybeValidate.call(instance, c);
      }
      vd.set(Ctor, instance);
    } catch (e: any) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, e?.message ?? "Validation failed");
    }

    await next();
  });
}

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

    // ✅ Parity with HTTP: validation is middleware at the front
    this.middlewares.unshift(WSTypeValidator(source, ctor));
    return this;
  }

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
