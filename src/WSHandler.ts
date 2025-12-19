import type {
  WSCloseFunc,
  WSDrainFunc,
  WSMessageFunc,
  WSOpenFunc,
} from "./WSHandlerFuncs";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import type { ServerWebSocket } from "bun";

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

  public createChain(
    handler: Function,
    middlewares: Middleware<HTTPContext>[],
  ): any {
    // Base handler execution
    let base = async (ws: ServerWebSocket<HTTPContext>, ...args: any[]) => {
      await handler(ws, ...args);
    };

    // Wrap middlewares
    for (let i = middlewares.length - 1; i >= 0; i--) {
      const middleware = middlewares[i];
      const nextChain = base;

      base = async (ws: ServerWebSocket<HTTPContext>, ...args: any[]) => {
        const context = ws.data;
        // Refactored: Updated to match strict Promise<void> signature of Middleware
        await middleware.execute(context, async () => {
          await nextChain(ws, ...args);
        });
      };
    }
    return base;
  }

  setOpen(handler: WSOpenFunc, middlewares: Middleware<HTTPContext>[]) {
    this.compiledOpen = this.createChain(handler, middlewares);
  }

  setMessage(handler: WSMessageFunc, middlewares: Middleware<HTTPContext>[]) {
    this.compiledMessage = this.createChain(handler, middlewares);
  }

  setDrain(handler: WSDrainFunc, middlewares: Middleware<HTTPContext>[]) {
    this.compiledDrain = this.createChain(handler, middlewares);
  }

  setClose(handler: WSCloseFunc, middlewares: Middleware<HTTPContext>[]) {
    this.compiledClose = this.createChain(handler, middlewares);
  }
}