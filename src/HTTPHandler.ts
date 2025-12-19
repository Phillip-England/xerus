import type { HTTPHandlerFunc } from "./HTTPHandlerFunc";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";

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
        // Refactored: Removed "if (context.isDone) return" check.
        // We trust the middleware to call next() if it wants to proceed.
        // This ensures that if next() IS called, we await it properly,
        // allowing errors to bubble up to the 'try/catch' in upstream middleware.
        
        await middleware.execute(context, async () => {
           await nextChain(context);
        });
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