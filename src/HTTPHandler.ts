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
    let chain = async (context: HTTPContext): Promise<void> => {
      await this.mainHandler(context);
    };

    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i];
      const nextChain = chain;

      chain = async (context: HTTPContext): Promise<void> => {
        if (context.isDone) return;
        await middleware.execute(context, async () => {
          await nextChain(context);
        });
      };
    }
    this.compiledChain = chain;
  }

  async execute(c: HTTPContext): Promise<Response> {
    await this.compiledChain(c);
    return c.res.send();
  }
}