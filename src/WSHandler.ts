import type {
  WSCloseFunc,
  WSDrainFunc,
  WSMessageFunc,
  WSOpenFunc,
} from "./WSHandlerFuncs";
import { Middleware } from "./Middleware";
import { WSContext } from "./WSContext";
import type { ServerWebSocket } from "bun";

export class WSHandler {
  public compiledOpen?: (ws: ServerWebSocket<WSContext>) => Promise<void>;
  public compiledMessage?: (
    ws: ServerWebSocket<WSContext>,
    message: string | Buffer,
  ) => Promise<void>;
  public compiledDrain?: (ws: ServerWebSocket<WSContext>) => Promise<void>;
  public compiledClose?: (
    ws: ServerWebSocket<WSContext>,
    code: number,
    reason: string,
  ) => Promise<void>;

  public createChain(
    handler: Function,
    middlewares: Middleware<any>[], // Use any to allow cross-compat
  ): any {
    let base = async (ws: ServerWebSocket<WSContext>, ...args: any[]) => {
      await handler(ws, ...args);
    };

    for (let i = middlewares.length - 1; i >= 0; i--) {
      const middleware = middlewares[i];
      const nextChain = base;

      base = async (ws: ServerWebSocket<WSContext>, ...args: any[]) => {
        const context = ws.data;
        // The generic Middleware.execute now accepts WSContext
        await middleware.execute(context, async () => {
          await nextChain(ws, ...args);
          return new Response(); 
        });
      };
    }
    return base;
  }

  setOpen(handler: WSOpenFunc, middlewares: Middleware<any>[]) {
    this.compiledOpen = this.createChain(handler, middlewares);
  }

  setMessage(handler: WSMessageFunc, middlewares: Middleware<any>[]) {
    this.compiledMessage = this.createChain(handler, middlewares);
  }

  setDrain(handler: WSDrainFunc, middlewares: Middleware<any>[]) {
    this.compiledDrain = this.createChain(handler, middlewares);
  }

  setClose(handler: WSCloseFunc, middlewares: Middleware<any>[]) {
    this.compiledClose = this.createChain(handler, middlewares);
  }
}