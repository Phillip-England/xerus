import { join } from "path";

//====================================
// utils
//====================================

// Utility function to convert a path into a regex
function pathToRegex(path: string): RegExp {
  return new RegExp("^" + path.replace(/:\w+/g, "([^/]+)").replace(/\*/g, ".*") + "/?$");
}

export function merge(...headersList: Headers[]): Headers {
  const mergedHeaders = new Headers();

  for (const headers of headersList) {
    headers.forEach((value, key) => {
      mergedHeaders.set(key, value);
    });
  }

  return mergedHeaders;
}


//====================================
// types
//====================================

type Handler = (ctx: Context) => Promise<Response>;
type Middleware = (ctx: Context, next: () => Promise<Response>) => Promise<Response>;
type ErrorHandler = (ctx: Context, err: unknown) => Promise<Response> | Response;

//====================================
// handlers
//====================================

export function staticHandler(staticDir: string) {
	return async (c: Context): Promise<Response> => {
	  const url = new URL(c.req.url);
	  const filePath = join(staticDir, url.pathname.replace(/^\/static\//, "")); // Resolve file path
		const file = Bun.file(filePath);
		if (!(await file.exists())) {
			return new Response("404 Not Found", { status: 404 });
		}
	  return new Response(file.stream(), {
		headers: {
		  "Content-Type": file.type || "application/octet",
		  "Cache-Control": "max-age=3600", // Cache for 1 hour
		  "ETag": `"${filePath}-${file.size}-${file.lastModified}"`,
		},
	  });
	};
  }
  

//====================================
// middleware
//====================================

export async function logger(ctx: Context, next: () => Promise<Response>): Promise<Response> {
  const startTime = performance.now();
  const response = await next();
  const endTime = performance.now();
  const timeTaken = (endTime - startTime).toFixed(2);
  console.log(`[${ctx.req.method}][${new URL(ctx.req.url).pathname}][${timeTaken}ms]`);
  return response;
}

export function cors(options: {
  origin?: string;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
} = {}): Middleware {
  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    const {
      origin = "*",
      methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders = ["Content-Type", "Authorization"],
      exposedHeaders = [],
      credentials = false,
      maxAge = 86400,
    } = options;

    ctx.headers.set("Access-Control-Allow-Origin", origin);
    ctx.headers.set("Access-Control-Allow-Methods", methods.join(", "));
    ctx.headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
    ctx.headers.set("Access-Control-Expose-Headers", exposedHeaders.join(", "));
    if (credentials && origin !== "*") {
      ctx.headers.set("Access-Control-Allow-Credentials", "true");
    }
    ctx.headers.set("Access-Control-Max-Age", maxAge.toString());

    if (ctx.req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: ctx.headers });
    }

    return await next();
  };
}

export const errorHandler: Middleware = async (ctx, next) => {
  try {
    return await next();
  } catch (err) {
    console.error(`[${ctx.req.method}] ${new URL(ctx.req.url).pathname} - Error:`, err);

    let status = 500;
    let message = "Internal Server Error";

    if (err instanceof Error && err.message === "Malformed JSON body") {
      status = 400;
      message = "Bad Request: Malformed JSON";
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: new Headers({ "Content-Type": "application/json" }) }
    );
  }
};




//====================================
// context
//====================================

// Context class
export class Context {
  req: Request;
  params: Record<string, string> = {};
  store: Record<string, unknown> = {};
  query: Record<string, string>;
  headers: Headers; // Use Headers instead of Record<string, string>

  constructor(req: Request) {
    this.req = req;
    this.query = Object.fromEntries(new URL(req.url).searchParams.entries());
    this.headers = new Headers(); // Initialize as Bun Headers
  }

  setCookie(
    name: string,
    value: string,
    options: {
      path?: string;
      domain?: string;
      maxAge?: number;
      expires?: Date;
      secure?: boolean;
      httpOnly?: boolean;
      sameSite?: "Strict" | "Lax" | "None";
    } = {}
  ) {
    let cookieValue = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (options.path) cookieValue += `; Path=${options.path}`;
    if (options.domain) cookieValue += `; Domain=${options.domain}`;
    if (options.maxAge !== undefined) cookieValue += `; Max-Age=${options.maxAge}`;
    if (options.expires) cookieValue += `; Expires=${options.expires.toUTCString()}`;
    if (options.secure) cookieValue += `; Secure`;
    if (options.httpOnly) cookieValue += `; HttpOnly`;
    if (options.sameSite) cookieValue += `; SameSite=${options.sameSite}`;

    this.headers.append("Set-Cookie", cookieValue); // Append cookie using Headers API
  }

  deleteCookie(name: string, path: string = "/") {
    this.setCookie(name, "", { path, expires: new Date(0) });
  }

html(body: string, status: number = 200): Response {
    return new Response(body, { 
        status, 
        headers: merge(new Headers({ "Content-Type": "text/html" }), this.headers) 
    });
}

htmlStream(dataGenerator: AsyncIterable<string>, status: number = 200): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            for await (const chunk of dataGenerator) {
                controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
        },
    });

    return new Response(stream, {
        status,
        headers: merge(new Headers({ "Content-Type": "text/html" }), this.headers),
    });
}


	json(data: unknown, status: number = 200): Response {
    if (typeof data === "object" && data !== null && Symbol.asyncIterator in data) {
        return this.jsonStream(data as AsyncIterable<unknown>, status);
    }
    return new Response(JSON.stringify(data), { 
        status, 
        headers: merge(new Headers({ "Content-Type": "application/json" }), this.headers) 
    });
}

	jsonStream(dataGenerator: AsyncIterable<unknown>, status: number = 200): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            controller.enqueue(encoder.encode("["));
            let first = true;
            for await (const item of dataGenerator) {
                if (!first) controller.enqueue(encoder.encode(","));
                first = false;
                controller.enqueue(encoder.encode(JSON.stringify(item)));
            }
            controller.enqueue(encoder.encode("]"));
            controller.close();
        },
    });

    return new Response(stream, {
        status,
        headers: merge(new Headers({ "Content-Type": "application/json" }), this.headers),
    });
}


  redirect(url: string, status: number = 302): Response {
    return new Response(null, {
      status,
      headers: merge(new Headers({ Location: url }), this.headers),
    });
  }

	async parseBody<T = unknown>(): Promise<T | null> {
    const contentType = this.req.headers.get("Content-Type");

    if (!contentType) return null;

    try {
        const text = await this.req.text();
        if (!text.trim()) {
            return null; // Return null if body is empty
        }

        if (contentType.includes("application/json")) {
            try {
                return JSON.parse(text) as T; // Manually parse JSON
            } catch (error) {
                throw new Error("Malformed JSON body"); // Throw error for malformed JSON
            }
        }

        if (contentType.includes("application/x-www-form-urlencoded")) {
            const formData = new URLSearchParams(text);
            return Object.fromEntries(formData.entries()) as T;
        }

        if (contentType.includes("multipart/form-data")) {
            const formData = await this.req.formData();
            const data: Record<string, unknown> = {};
            formData.forEach((value, key) => {
                if (data[key]) {
                    if (Array.isArray(data[key])) {
                        (data[key] as any[]).push(value);
                    } else {
                        data[key] = [data[key], value];
                    }
                } else {
                    data[key] = value;
                }
            });
            return data as T;
        }

        if (contentType.includes("text/plain")) {
            return text as T;
        }
    } catch (error) {
        console.error("Error parsing request body:", error);
        throw error; // Ensure errors are propagated to the error handler
    }

    return null;
}

}


//====================================
// router
//====================================

type RouteNode = {
  children: Record<string, RouteNode>;
  wildcard?: RouteNode;
  handlers: Partial<Record<string, { regex: RegExp; handlers: Middleware[]; finalHandler: Handler }>>;
};

export class Xerus {

  private trie: RouteNode = { children: {}, handlers: {} };
	private globalErrorHandler: ErrorHandler = async (ctx, err) => {
    console.error("Unhandled Error:", err);

    let status = 500;
    let message = "Internal Server Error";

    if (err instanceof Response) {
        return err; // Allows early returns from middleware as responses.
    } else if (err instanceof Error) {
        message = err.message;
    } else if (typeof err === "string") {
        message = err;
    }

    return new Response(
        JSON.stringify({
            error: true,
            message: status === 500 ? "An unexpected error occurred" : message,
        }),
        {
            status,
            headers: { "Content-Type": "application/json" },
        }
    );
};
  private globalMiddlewares: Middleware[] = [];

  /**
   * Set a global error handler for handling uncaught errors.
   */
  setErrorHandler(handler: ErrorHandler) {
    this.globalErrorHandler = handler;
  }

  /**
   * Use global middleware for all routes.
   */
  use(...middlewares: Middleware[]) {
    this.globalMiddlewares.push(...middlewares);
  }

  private register(method: string, path: string, handler: Handler, middlewares: Middleware[]) {
    const segments = path.split('/').filter(Boolean);
    let node = this.trie;

    for (const segment of segments) {
      if (segment === "*") {
        if (!node.wildcard) {
          node.wildcard = { children: {}, handlers: {} };
        }
        node = node.wildcard;
      } else {
        if (!node.children[segment]) {
          node.children[segment] = { children: {}, handlers: {} };
        }
        node = node.children[segment];
      }
    }
    node.handlers[method] = { regex: pathToRegex(path), handlers: middlewares, finalHandler: handler };
  }

  get(path: string, handler: Handler, ...middlewares: Middleware[]) {
    this.register("GET", path, handler, middlewares);
  }

  post(path: string, handler: Handler, ...middlewares: Middleware[]) {
    this.register("POST", path, handler, middlewares);
  }

  put(path: string, handler: Handler, ...middlewares: Middleware[]) {
    this.register("PUT", path, handler, middlewares);
  }

  patch(path: string, handler: Handler, ...middlewares: Middleware[]) {
    this.register("PATCH", path, handler, middlewares);
  }

  delete(path: string, handler: Handler, ...middlewares: Middleware[]) {
    this.register("DELETE", path, handler, middlewares);
  }

  options(path: string, handler: Handler, ...middlewares: Middleware[]) {
    this.register("OPTIONS", path, handler, middlewares);
  }

  head(path: string, handler: Handler, ...middlewares: Middleware[]) {
    this.register("HEAD", path, handler, middlewares);
  }

	async handleRequest(req: Request): Promise<Response> {
		try {
			const url = new URL(req.url);
			const pathname = url.pathname;
			const segments = pathname.split("/").filter(Boolean);
	
			let node: RouteNode | null = this.trie;
			let ctx = new Context(req);
	
			let paramMatches: Record<string, string> = {};
			let exactMatchNode: RouteNode | null = node;
			let paramMatchNode: RouteNode | null = null;
			let wildcardNode: RouteNode | null = null;
			let wildcardMatch: string | null = null;
	
			for (let i = 0; i < segments.length; i++) {
				const segment = segments[i];
	
				if (exactMatchNode?.children[segment]) {
					exactMatchNode = exactMatchNode.children[segment];
				} else {
					exactMatchNode = null;
				}
	
				const paramKey: any = Object.keys(node.children).find((k) => k.startsWith(":"));
				if (paramKey) {
					paramMatches[paramKey.slice(1)] = segment;
					paramMatchNode = node.children[paramKey];
				}
	
				if (node.wildcard) {
					wildcardMatch = segments.slice(i).join("/");
					wildcardNode = node.wildcard;
					break;
				}
	
				if (node.children[segment]) {
					node = node.children[segment];
				} else if (paramMatchNode) {
					node = paramMatchNode;
				} else {
					node = wildcardNode;
					break;
				}
			}
	
			let matchedNode = exactMatchNode || paramMatchNode || wildcardNode;
			if (!matchedNode) return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: new Headers({ "Content-Type": "application/json" }) });
	
			const methodHandlers = matchedNode.handlers[req.method];
			if (!methodHandlers) {
				return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
					status: 405,
					headers: new Headers({ "Content-Type": "application/json" }),
				});
			}
	
			ctx.params = { ...ctx.params, ...paramMatches };
			if (wildcardMatch) ctx.params["*"] = wildcardMatch;
	
			return this.runMiddlewares(
				[...this.globalMiddlewares, ...methodHandlers.handlers, async (c: Context) => methodHandlers.finalHandler(c)],
				ctx
			);
		} catch (err) {
			return this.globalErrorHandler(new Context(req), err);
		}
	}	


  private async runMiddlewares(handlers: (Middleware | Handler)[], ctx: Context): Promise<Response> {
    let index = -1;
    const next = async (): Promise<Response> => {
      index++;
      if (index >= handlers.length) return new Response("Unexpected server error", { status: 500 });

      try {
        return await handlers[index](ctx, next);
      } catch (err) {
        return this.globalErrorHandler(ctx, err);
      }
    };
    return next();
  }
}