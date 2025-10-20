import type { HTTPHandlerFunc } from "./HTTPHandlerFunc";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";

export class HTTPHandler {
  private mainHandler: HTTPHandlerFunc;
  private middlewares: Middleware[];
  private compiledChain: (c: HTTPContext) => Promise<Response>;

  constructor(mainHandler: HTTPHandlerFunc) {
    this.mainHandler = mainHandler;
    this.middlewares = [];
    this.compiledChain = async (c: HTTPContext) => await this.mainHandler(c); // Default
  }

  setMiddlewares(middlewares: Middleware[]) {
    this.middlewares = middlewares;
    this.precompileChain();
  }

  private precompileChain() {
    let chain = async (context: HTTPContext): Promise<Response> => {
      try {
        return await this.mainHandler(context);
      } catch (error) {
        throw error; // Ensure error propagates
      }
    };

    // Apply middlewares in reverse order
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i];
      const nextChain = chain;
      chain = async (context: HTTPContext): Promise<Response> => {
        try {
          let finalResponse: Response | undefined;

          const result = await middleware.execute(context, async () => {
            const response = await nextChain(context);
            finalResponse = response;
            return response;
          });

          return result instanceof Response ? result : finalResponse ||
            new Response("no response generated", { status: 500 });
        } catch (error) {
          throw error;
        }
      };
    }

    this.compiledChain = chain;
  }

  async execute(c: HTTPContext): Promise<Response> {
    return this.compiledChain(c);
  }
}