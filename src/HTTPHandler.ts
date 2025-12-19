import type { HTTPHandlerFunc } from "./HTTPHandlerFunc";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";

export class HTTPHandler {
  private mainHandler: HTTPHandlerFunc;
  private middlewares: Middleware[];
  private compiledChain: (c: HTTPContext) => Promise<void>;

  constructor(mainHandler: HTTPHandlerFunc) {
    this.mainHandler = mainHandler;
    this.middlewares = [];
    this.compiledChain = async (c: HTTPContext) => { await this.mainHandler(c); };
  }

  setMiddlewares(middlewares: Middleware[]) {
    this.middlewares = middlewares;
    this.precompileChain();
  }

  private precompileChain() {
    // The innermost link: the actual route handler
    let chain = async (context: HTTPContext): Promise<void> => {
      await this.mainHandler(context);
    };

    // Wrap middlewares in reverse order (Onion architecture)
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i];
      const nextChain = chain;

      chain = async (context: HTTPContext): Promise<void> => {
        let nextPending = false;

        // We wrap the next function to track its state
        const safeNext = async () => {
          nextPending = true;
          try {
            await nextChain(context);
          } finally {
            nextPending = false;
          }
        };
        
        // Execute the middleware
        await middleware.execute(context, safeNext);

        // SAFEGUARD: 
        // If nextPending is still true here, it means the middleware function 
        // returned (finished) BUT the next() promise is still running.
        // This implies they called next() but did not await it.
        if (nextPending) {
           throw new SystemErr(
             SystemErrCode.MIDDLEWARE_ERROR, 
             "A Middleware called next() but did not await it. This breaks the request lifecycle and error handling."
           );
        }
      };
    }
    this.compiledChain = chain;
  }

  async execute(c: HTTPContext): Promise<Response> {
    // Errors thrown here will bubble up to Xerus.handleHTTP
    await this.compiledChain(c);
    return c.res.send();
  }
}