// PATH: /home/jacex/src/xerus/src/HTTPHandler.ts

import type { HTTPHandlerFunc, HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";

export class HTTPHandler {
  private mainHandler: HTTPHandlerFunc;
  private errorHandler?: HTTPErrorHandlerFunc;
  private middlewares: Middleware[];
  private compiledChain: (c: HTTPContext) => Promise<void>;

  constructor(mainHandler: HTTPHandlerFunc, errorHandler?: HTTPErrorHandlerFunc) {
    this.mainHandler = mainHandler;
    this.errorHandler = errorHandler;
    this.middlewares = [];
    this.compiledChain = async (c: HTTPContext) => {
      await this.mainHandler(c, c.validated);
    };
  }

  setMiddlewares(middlewares: Middleware[]) {
    this.middlewares = middlewares;
    this.precompileChain();
  }

  private precompileChain() {
    let chain = async (context: HTTPContext): Promise<void> => {
      await this.mainHandler(context, context.validated);
    };

    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i];
      const nextChain = chain;

      chain = async (context: HTTPContext): Promise<void> => {
        let nextPending = false;

        const safeNext = async () => {
          nextPending = true;
          try {
            await nextChain(context);
          } finally {
            nextPending = false;
          }
        };

        await middleware.execute(context, safeNext);

        // Inside precompileChain
        if (nextPending) {
          // If the timeout won, we don't care if next() wasn't awaited to completion
          // because we've already sent the 504.
          if (context.data?.__timeoutSent) return; 

          throw new SystemErr(
            SystemErrCode.MIDDLEWARE_ERROR,
            "A Middleware called next() but did not await it..."
          );
        }
      };
    }

    this.compiledChain = chain;
  }

  async execute(c: HTTPContext): Promise<Response> {
    try {
      await this.compiledChain(c);
    } catch (e: any) {
      if (this.errorHandler) {
        c.setErr(e);
        await this.errorHandler(c, e);
        return c.res.send();
      }

      throw e;
    }

    return c.res.send();
  }
}
