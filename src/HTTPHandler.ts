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
    this.compiledChain = async (c: HTTPContext) => await this.mainHandler(c); 
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
        throw error; 
      }
    };
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i];
      const nextChain = chain;

      chain = async (context: HTTPContext): Promise<Response> => {
        let chainResponse: Response | undefined;
        let nextCalled = false;

        try {
          const next = async (): Promise<Response> => {
            nextCalled = true;
            chainResponse = await nextChain(context);
            return chainResponse;
          };
          const middlewareResult = await middleware.execute(context, next);
          if (middlewareResult instanceof Response) {
            return middlewareResult;
          }
          if (nextCalled && chainResponse) {
            return chainResponse;
          }
          return new Response("Middleware failed to provide a response or call next()", { 
            status: 500 
          });

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