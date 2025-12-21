// PATH: /home/jacex/src/xerus/src/WSHandler.ts

import type { ServerWebSocket } from "bun";
import { Middleware } from "./Middleware";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import type { HTTPContext } from "./HTTPContext";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { WSContext } from "./WSContext";
import type { WSCloseFunc, WSDrainFunc, WSMessageFunc, WSOpenFunc } from "./WSHandlerFuncs";
import type { ValidatedData } from "./ValidatedData";

type EventType = "OPEN" | "MESSAGE" | "CLOSE" | "DRAIN";

export class WSHandler {
  public compiledOpen?: (ws: ServerWebSocket<HTTPContext>) => Promise<void>;
  public compiledMessage?: (ws: ServerWebSocket<HTTPContext>, message: string | Buffer) => Promise<void>;
  public compiledDrain?: (ws: ServerWebSocket<HTTPContext>) => Promise<void>;
  public compiledClose?: (ws: ServerWebSocket<HTTPContext>, code: number, reason: string) => Promise<void>;

  private normalizeEventState(event: EventType, http: HTTPContext, args: any[]) {
    // ✅ Event-local validated store (reused + cleared)
    let vd = http.getStore("__wsValidated") as ValidatedData | undefined;
    if (!vd) {
      // Create lazily; keeps allocation down if no WS used
      vd = new (http.validated.constructor as any)() as ValidatedData;
      http.setStore("__wsValidated", vd);
    } else {
      vd.clear();
    }

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

  private createChain(
    event: EventType,
    handler: (c: WSContext, data: ValidatedData) => Promise<void>,
    middlewares: Middleware<HTTPContext>[],
    errHandler?: HTTPErrorHandlerFunc,
  ) {
    return async (ws: ServerWebSocket<HTTPContext>, ...args: any[]) => {
      const http = ws.data;

      // Make the current socket visible to validation middleware (and any advanced MW)
      http.setStore("__wsSocket", ws);

      const normalized = this.normalizeEventState(event, http, args);

      const c = new WSContext(ws, http, {
        message: normalized.message as any,
        code: normalized.code,
        reason: normalized.reason,
      });

      let core = async (): Promise<void> => {
        await handler(c, c.data);
      };

      // Onion wrap: middleware are HTTPContext middlewares (logger/requestId/etc)
      for (let i = middlewares.length - 1; i >= 0; i--) {
        const mw = middlewares[i];
        const nextCore = core;

        core = async () => {
          let nextPending = false;
          const safeNext = async () => {
            nextPending = true;
            try {
              await nextCore();
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
              return;
            }
            throw e;
          }

          if (nextPending) {
            throw new SystemErr(
              SystemErrCode.MIDDLEWARE_ERROR,
              "A WebSocket Middleware called next() but did not await it.",
            );
          }
        };
      }

      try {
        await core();
      } catch (e: any) {
        if (errHandler) {
          http.setErr(e);
          await errHandler(http, e);
          return;
        }
        throw e;
      } finally {
        // clean per-event socket ref
        http.setStore("__wsSocket", undefined);
      }
    };
  }

  setOpen(
    handler: WSOpenFunc,
    middlewares: Middleware<HTTPContext>[],
    errHandler?: HTTPErrorHandlerFunc,
  ) {
    this.compiledOpen = this.createChain("OPEN", handler, middlewares, errHandler);
  }

  setMessage(
    handler: WSMessageFunc,
    middlewares: Middleware<HTTPContext>[],
    errHandler?: HTTPErrorHandlerFunc,
  ) {
    this.compiledMessage = this.createChain("MESSAGE", handler, middlewares, errHandler);
  }

  setDrain(
    handler: WSDrainFunc,
    middlewares: Middleware<HTTPContext>[],
    errHandler?: HTTPErrorHandlerFunc,
  ) {
    this.compiledDrain = this.createChain("DRAIN", handler, middlewares, errHandler);
  }

  setClose(
    handler: WSCloseFunc,
    middlewares: Middleware<HTTPContext>[],
    errHandler?: HTTPErrorHandlerFunc,
  ) {
    this.compiledClose = this.createChain("CLOSE", handler, middlewares, errHandler);
  }
}
