import type { ServerWebSocket } from "bun";
import { Middleware } from "./Middleware";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import type { HTTPContext } from "./HTTPContext";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { WSContext } from "./WSContext";
import type { WSCloseFunc, WSDrainFunc, WSMessageFunc, WSOpenFunc } from "./WSHandlerFuncs";
import { SourceType, type WSValidationSource } from "./ValidationSource";
import type { Constructable } from "./HTTPContext";
import type { TypeValidator } from "./TypeValidator";

type EventType = "OPEN" | "MESSAGE" | "CLOSE" | "DRAIN";

export type WSClassValidation = {
  source: WSValidationSource;
  ctor: Constructable<any>;
};

export class WSHandler {
  public compiledOpen?: (ws: ServerWebSocket<HTTPContext>) => Promise<void>;
  public compiledMessage?: (ws: ServerWebSocket<HTTPContext>, message: string | Buffer) => Promise<void>;
  public compiledDrain?: (ws: ServerWebSocket<HTTPContext>) => Promise<void>;
  public compiledClose?: (ws: ServerWebSocket<HTTPContext>, code: number, reason: string) => Promise<void>;

  private normalizeEventState(event: EventType, http: HTTPContext, args: any[]) {
    http.validated.clear();

    if (event === "MESSAGE") {
      const msg = (args[0] ?? null) as string | Buffer | null;
      http._wsMessage = msg;
      http.setStore("_wsCloseArgs", undefined);
      return { message: msg, code: 0, reason: "" };
    }

    if (event === "CLOSE") {
      const code = (args[0] ?? 0) as number;
      const reason = (args[1] ?? "") as string;
      http._wsMessage = null;
      http.setStore("_wsCloseArgs", { code, reason });
      return { message: "", code, reason };
    }

    http._wsMessage = null;
    http.setStore("_wsCloseArgs", undefined);
    return { message: "", code: 0, reason: "" };
  }

  private extractWSRaw(c: WSContext, source: WSValidationSource) {
    switch (source.type) {
      case SourceType.QUERY:
        return source.key ? c.http.query(source.key, "") : c.http.queries;
      case SourceType.PARAM:
        return c.http.getParam(source.key, "");
      case SourceType.HEADER:
        return c.http.getHeader(source.key);
      case SourceType.WS_MESSAGE: {
        const msg = c.message;
        if (Buffer.isBuffer(msg)) return msg.toString();
        return msg;
      }
      case SourceType.WS_CLOSE:
        return { code: c.code ?? 0, reason: c.reason ?? "" };

      // Not supported for WS validation in this design
      case SourceType.JSON:
      case SourceType.FORM:
      case SourceType.MULTIPART:
      case SourceType.TEXT:
        throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, `${source.type} is not supported for WS validation`);

      default:
        throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Unknown validation source");
    }
  }

  /**
   * ✅ Single validation style (class-based) for WS:
   * - instantiate class with extracted raw
   * - call instance.validate(c) if present
   * - store under class key so data.get(Class) works
   */
  private async runValidations(c: WSContext, validations?: WSClassValidation[]) {
    if (!validations || validations.length === 0) return;

    for (const v of validations) {
      let raw: any;
      try {
        raw = this.extractWSRaw(c, v.source);
      } catch (e: any) {
        throw new SystemErr(
          SystemErrCode.BODY_PARSING_FAILED,
          `Data Extraction Failed: ${e?.message ?? String(e)}`,
        );
      }

      try {
        const instance: any = new (v.ctor as any)(raw);
        const maybeValidate = (instance as TypeValidator<WSContext> | undefined)?.validate;
        if (typeof maybeValidate === "function") {
          await maybeValidate.call(instance, c);
        }
        c.data.set(v.ctor, instance);
      } catch (e: any) {
        throw new SystemErr(SystemErrCode.VALIDATION_FAILED, e?.message ?? "Validation failed");
      }
    }
  }

  private createChain(
    event: EventType,
    handler: (c: WSContext, data: HTTPContext["validated"]) => Promise<void>,
    middlewares: Middleware<HTTPContext>[],
    errHandler?: HTTPErrorHandlerFunc,
    validations?: WSClassValidation[],
  ) {
    let chain = async (ws: ServerWebSocket<HTTPContext>, ...args: any[]) => {
      const http = ws.data;
      const normalized = this.normalizeEventState(event, http, args);

      const c = new WSContext(ws, http, {
        message: normalized.message as any,
        code: normalized.code,
        reason: normalized.reason,
      });

      try {
        await this.runValidations(c, validations);
        await handler(c, c.data);
      } catch (e: any) {
        if (errHandler) {
          http.setErr(e);
          await errHandler(http, e);
          return;
        }
        throw e;
      }
    };

    for (let i = middlewares.length - 1; i >= 0; i--) {
      const mw = middlewares[i];
      const nextChain = chain;

      chain = async (ws: ServerWebSocket<HTTPContext>, ...args: any[]) => {
        const http = ws.data;
        this.normalizeEventState(event, http, args);

        let nextPending = false;
        const safeNext = async () => {
          nextPending = true;
          try {
            await nextChain(ws, ...args);
          } finally {
            nextPending = false;
          }
        };

        try {
          await mw.execute(http, safeNext);
        } catch (e: any) {
          if (errHandler) {
            http.setErr(e);
            await errHandler(http, e);
          } else {
            throw e;
          }
        }

        if (nextPending) {
          throw new SystemErr(
            SystemErrCode.MIDDLEWARE_ERROR,
            "A WebSocket Middleware called next() but did not await it.",
          );
        }
      };
    }

    return chain;
  }

  setOpen(
    handler: WSOpenFunc,
    middlewares: Middleware<HTTPContext>[],
    errHandler?: HTTPErrorHandlerFunc,
    validations?: WSClassValidation[],
  ) {
    this.compiledOpen = this.createChain("OPEN", handler, middlewares, errHandler, validations);
  }

  setMessage(
    handler: WSMessageFunc,
    middlewares: Middleware<HTTPContext>[],
    errHandler?: HTTPErrorHandlerFunc,
    validations?: WSClassValidation[],
  ) {
    this.compiledMessage = this.createChain("MESSAGE", handler, middlewares, errHandler, validations);
  }

  setDrain(
    handler: WSDrainFunc,
    middlewares: Middleware<HTTPContext>[],
    errHandler?: HTTPErrorHandlerFunc,
    validations?: WSClassValidation[],
  ) {
    this.compiledDrain = this.createChain("DRAIN", handler, middlewares, errHandler, validations);
  }

  setClose(
    handler: WSCloseFunc,
    middlewares: Middleware<HTTPContext>[],
    errHandler?: HTTPErrorHandlerFunc,
    validations?: WSClassValidation[],
  ) {
    this.compiledClose = this.createChain("CLOSE", handler, middlewares, errHandler, validations);
  }
}
