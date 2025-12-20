// PATH: /home/jacex/src/xerus/src/WSHandler.ts

import type { ServerWebSocket } from "bun";
import { Middleware } from "./Middleware";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import type { HTTPContext } from "./HTTPContext";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { WSContext } from "./WSContext";
import type { WSCloseFunc, WSDrainFunc, WSMessageFunc, WSOpenFunc } from "./WSHandlerFuncs";

type EventType = "OPEN" | "MESSAGE" | "CLOSE" | "DRAIN";

export class WSHandler {
  public compiledOpen?: (ws: ServerWebSocket<HTTPContext>) => Promise<void>;
  public compiledMessage?: (ws: ServerWebSocket<HTTPContext>, message: string | Buffer) => Promise<void>;
  public compiledDrain?: (ws: ServerWebSocket<HTTPContext>) => Promise<void>;
  public compiledClose?: (ws: ServerWebSocket<HTTPContext>, code: number, reason: string) => Promise<void>;

  private createChain(
    event: EventType,
    handler: (c: WSContext, data: HTTPContext["validated"]) => Promise<void>,
    middlewares: Middleware<HTTPContext>[],
    errHandler?: HTTPErrorHandlerFunc,
  ) {
    let chain = async (ws: ServerWebSocket<HTTPContext>, ...args: any[]) => {
      const http = ws.data;

      let c: WSContext;
      if (event === "MESSAGE") {
        const msg = (args[0] ?? null) as string | Buffer | null;
        http._wsMessage = msg;
        c = new WSContext(ws, http, { message: msg });
      } else if (event === "CLOSE") {
        const code = (args[0] ?? 0) as number;
        const reason = (args[1] ?? "") as string;
        http.setStore("_wsCloseArgs", { code, reason });
        c = new WSContext(ws, http, { code, reason });
      } else {
        c = new WSContext(ws, http);
      }

      try {
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

        if (event === "MESSAGE") {
          http._wsMessage = (args[0] ?? null) as any;
        } else if (event === "CLOSE") {
          const code = (args[0] ?? 0) as number;
          const reason = (args[1] ?? "") as string;
          http.setStore("_wsCloseArgs", { code, reason });
        }

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

  setOpen(handler: WSOpenFunc, middlewares: Middleware<HTTPContext>[], errHandler?: HTTPErrorHandlerFunc) {
    this.compiledOpen = this.createChain("OPEN", handler, middlewares, errHandler);
  }

  setMessage(handler: WSMessageFunc, middlewares: Middleware<HTTPContext>[], errHandler?: HTTPErrorHandlerFunc) {
    this.compiledMessage = this.createChain("MESSAGE", handler, middlewares, errHandler);
  }

  setDrain(handler: WSDrainFunc, middlewares: Middleware<HTTPContext>[], errHandler?: HTTPErrorHandlerFunc) {
    this.compiledDrain = this.createChain("DRAIN", handler, middlewares, errHandler);
  }

  setClose(handler: WSCloseFunc, middlewares: Middleware<HTTPContext>[], errHandler?: HTTPErrorHandlerFunc) {
    this.compiledClose = this.createChain("CLOSE", handler, middlewares, errHandler);
  }
}
