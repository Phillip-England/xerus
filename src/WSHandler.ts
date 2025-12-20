// PATH: /home/jacex/src/xerus/src/WSHandler.ts

import type { ServerWebSocket } from "bun";
import { Middleware } from "./Middleware";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import type { HTTPContext } from "./HTTPContext";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { WSContext } from "./WSContext";
import type { WSCloseFunc, WSDrainFunc, WSMessageFunc, WSOpenFunc } from "./WSHandlerFuncs";
import { Source } from "./ValidationSource";
import type { WSValidation } from "./WSRoute";

type EventType = "OPEN" | "MESSAGE" | "CLOSE" | "DRAIN";

export class WSHandler {
  public compiledOpen?: (ws: ServerWebSocket<HTTPContext>) => Promise<void>;
  public compiledMessage?: (ws: ServerWebSocket<HTTPContext>, message: string | Buffer) => Promise<void>;
  public compiledDrain?: (ws: ServerWebSocket<HTTPContext>) => Promise<void>;
  public compiledClose?: (ws: ServerWebSocket<HTTPContext>, code: number, reason: string) => Promise<void>;

  private normalizeEventState(event: EventType, http: HTTPContext, args: any[]) {
    // validated is PER-EVENT
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

  private extractWSRaw(c: WSContext, source: Source, key: string) {
    switch (source) {
      // HTTP-ish sources still valid in WS, via upgrade request context
      case Source.JSON:
      case Source.FORM:
      case Source.MULTIPART:
      case Source.TEXT:
        // Generally not used for WS events; but allow it if someone wants upgrade body.
        // (Upgrade is GET so usually empty.)
        throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, `${source} is not supported for WS validation`);

      case Source.QUERY:
        return key ? c.http.query(key, "") : c.http.queries;

      case Source.PARAM:
        if (!key) throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Source.PARAM requires a key");
        return c.http.getParam(key, "");

      case Source.HEADER:
        if (!key) throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Source.HEADER requires a key");
        return c.http.getHeader(key);

      case Source.WS_MESSAGE: {
        const msg = c.message;
        if (Buffer.isBuffer(msg)) return msg.toString();
        return msg;
      }

      case Source.WS_CLOSE:
        return { code: c.code ?? 0, reason: c.reason ?? "" };

      default:
        throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Unknown validation source");
    }
  }

  private async runValidations(c: WSContext, validations?: WSValidation[]) {
    if (!validations || validations.length === 0) return;

    for (const v of validations) {
      const raw = this.extractWSRaw(c, v.source, v.sourceKey);
      const validated = await v.fn(c, raw);
      c.data.set(v.outKey, validated);
    }
  }

  private createChain(
    event: EventType,
    handler: (c: WSContext, data: HTTPContext["validated"]) => Promise<void>,
    middlewares: Middleware<HTTPContext>[],
    errHandler?: HTTPErrorHandlerFunc,
    validations?: WSValidation[],
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
        // ✅ validations run BEFORE handler
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

  setOpen(handler: WSOpenFunc, middlewares: Middleware<HTTPContext>[], errHandler?: HTTPErrorHandlerFunc, validations?: WSValidation[]) {
    this.compiledOpen = this.createChain("OPEN", handler, middlewares, errHandler, validations);
  }

  setMessage(handler: WSMessageFunc, middlewares: Middleware<HTTPContext>[], errHandler?: HTTPErrorHandlerFunc, validations?: WSValidation[]) {
    this.compiledMessage = this.createChain("MESSAGE", handler, middlewares, errHandler, validations);
  }

  setDrain(handler: WSDrainFunc, middlewares: Middleware<HTTPContext>[], errHandler?: HTTPErrorHandlerFunc, validations?: WSValidation[]) {
    this.compiledDrain = this.createChain("DRAIN", handler, middlewares, errHandler, validations);
  }

  setClose(handler: WSCloseFunc, middlewares: Middleware<HTTPContext>[], errHandler?: HTTPErrorHandlerFunc, validations?: WSValidation[]) {
    this.compiledClose = this.createChain("CLOSE", handler, middlewares, errHandler, validations);
  }
}
