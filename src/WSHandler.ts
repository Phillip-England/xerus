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
  private rawHandlers: {
    open?: WSOpenFunc;
    message?: WSMessageFunc;
    drain?: WSDrainFunc;
    close?: WSCloseFunc;
  };

  private middlewares: Middleware[];

  // Compiled versions that include middleware logic
  public compiledOpen: (ws: ServerWebSocket<WSContext>) => Promise<void>;
  public compiledMessage: (
    ws: ServerWebSocket<WSContext>,
    message: string | Buffer,
  ) => Promise<void>;
  public compiledDrain: (ws: ServerWebSocket<WSContext>) => Promise<void>;
  public compiledClose: (
    ws: ServerWebSocket<WSContext>,
    code: number,
    reason: string,
  ) => Promise<void>;

  constructor(handlers: {
    open?: WSOpenFunc;
    message?: WSMessageFunc;
    drain?: WSDrainFunc;
    close?: WSCloseFunc;
  }) {
    this.rawHandlers = handlers;
    this.middlewares = [];

    this.compiledOpen = async (ws) => {
      if (this.rawHandlers.open) await this.rawHandlers.open(ws);
    };
    this.compiledMessage = async (ws, msg) => {
      if (this.rawHandlers.message) await this.rawHandlers.message(ws, msg);
    };
    this.compiledDrain = async (ws) => {
      if (this.rawHandlers.drain) await this.rawHandlers.drain(ws);
    };
    this.compiledClose = async (ws, c, r) => {
      if (this.rawHandlers.close) await this.rawHandlers.close(ws, c, r);
    };
  }

  setMiddlewares(middlewares: Middleware[]) {
    this.middlewares = middlewares;
    this.precompile();
  }

  private precompile() {
    this.compiledMessage = this.wrapHandler("message");
    this.compiledOpen = this.wrapHandler("open");
    this.compiledDrain = this.wrapHandler("drain");
    this.compiledClose = this.wrapHandler("close");
  }

  private wrapHandler(type: keyof typeof this.rawHandlers): any {
    let base = async (ws: ServerWebSocket<WSContext>, ...args: any[]) => {
      const handler = this.rawHandlers[type] as any;
      if (handler) await handler(ws, ...args);
    };

    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i];
      const nextChain = base;

      base = async (ws: ServerWebSocket<WSContext>, ...args: any[]) => {
        const context = ws.data as unknown as any;
        await middleware.execute(context, async () => {
          await nextChain(ws, ...args);
          return new Response();
        });
      };
    }
    return base;
  }
}
