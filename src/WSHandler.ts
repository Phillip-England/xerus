import type {
  WSCloseFunc,
  WSDrainFunc,
  WSMessageFunc,
  WSOpenFunc,
} from "./WSHandlerFuncs";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import type { ServerWebSocket } from "bun";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";

export class WSHandler {
  public compiledOpen?: (ws: ServerWebSocket<HTTPContext>) => Promise<void>;
  public compiledMessage?: (
    ws: ServerWebSocket<HTTPContext>,
    message: string | Buffer,
  ) => Promise<void>;
  public compiledDrain?: (ws: ServerWebSocket<HTTPContext>) => Promise<void>;
  public compiledClose?: (
    ws: ServerWebSocket<HTTPContext>,
    code: number,
    reason: string,
  ) => Promise<void>;

  // Store granular error handlers for each lifecycle event
  private openErrHandler?: HTTPErrorHandlerFunc;
  private messageErrHandler?: HTTPErrorHandlerFunc;
  private drainErrHandler?: HTTPErrorHandlerFunc;
  private closeErrHandler?: HTTPErrorHandlerFunc;

  public createChain(
    handler: Function,
    middlewares: Middleware<HTTPContext>[],
    errHandler?: HTTPErrorHandlerFunc
  ): any {
    // Base handler execution
    let base = async (ws: ServerWebSocket<HTTPContext>, ...args: any[]) => {
      try {
        await handler(ws, ...args);
      } catch (e: any) {
         if (errHandler) {
             const context = ws.data;
             context.setErr(e);
             await errHandler(context, e);
             // WebSockets cannot "return" a response like HTTP, 
             // but the error handler can log or send a message via ws.send
         } else {
             throw e; // Bubble to global
         }
      }
    };

    // Wrap middlewares
    for (let i = middlewares.length - 1; i >= 0; i--) {
      const middleware = middlewares[i];
      const nextChain = base;

      base = async (ws: ServerWebSocket<HTTPContext>, ...args: any[]) => {
        const context = ws.data;
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
            await middleware.execute(context, safeNext);
        } catch (e: any) {
             if (errHandler) {
                 context.setErr(e);
                 await errHandler(context, e);
             } else {
                 throw e;
             }
        }

        if (nextPending) {
           throw new SystemErr(
             SystemErrCode.MIDDLEWARE_ERROR, 
             "A WebSocket Middleware called next() but did not await it."
           );
        }
      };
    }
    return base;
  }

  setOpen(handler: WSOpenFunc, middlewares: Middleware<HTTPContext>[], errHandler?: HTTPErrorHandlerFunc) {
    this.openErrHandler = errHandler;
    this.compiledOpen = this.createChain(handler, middlewares, errHandler);
  }

  setMessage(handler: WSMessageFunc, middlewares: Middleware<HTTPContext>[], errHandler?: HTTPErrorHandlerFunc) {
    this.messageErrHandler = errHandler;
    this.compiledMessage = this.createChain(handler, middlewares, errHandler);
  }

  setDrain(handler: WSDrainFunc, middlewares: Middleware<HTTPContext>[], errHandler?: HTTPErrorHandlerFunc) {
    this.drainErrHandler = errHandler;
    this.compiledDrain = this.createChain(handler, middlewares, errHandler);
  }

  setClose(handler: WSCloseFunc, middlewares: Middleware<HTTPContext>[], errHandler?: HTTPErrorHandlerFunc) {
    this.closeErrHandler = errHandler;
    this.compiledClose = this.createChain(handler, middlewares, errHandler);
  }
}