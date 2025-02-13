import { Middleware } from "./middleware";
import type { Context } from "./context";

export class Handler {
  private mainHandler: (c: Context) => Promise<Response>;
  private middlewares: Middleware[];

  constructor(
    mainHandler: (c: Context) => Promise<Response>,
    ...middlewares: Middleware[]
  ) {
    this.mainHandler = mainHandler;
    this.middlewares = middlewares;
  }

  async execute(c: Context): Promise<Response> {
    // Build the execution chain from the inside out
    let chain = this.mainHandler;

    // Work backwards through middleware array to build chain from inside out
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i];
      const nextChain = chain;
      chain = async (context: Context): Promise<Response> => {
        let finalResponse: Response | undefined;

        // Execute the current middleware
        const result = await middleware.execute(context, async () => {
          const response = await nextChain(context);
          finalResponse = response;
          return response;
        });

        // Return early response from middleware if present
        if (result instanceof Response) {
          return result;
        }

        // Return the response from the next handler in chain
        if (finalResponse) {
          return finalResponse;
        }

        return new Response("no response generated", { status: 500 });
      };
    }

    // Execute the final chain
    return chain(c);
  }
}