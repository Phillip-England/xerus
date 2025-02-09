// Utility function to convert a path into a regex
function pathToRegex(path: string): RegExp {
  return new RegExp("^" + path.replace(/:\w+/g, "([^/]+)").replace(/\*/g, ".*") + "/?$");
}

// Utility function to merge multiple records into one
export function merge(...headersList: Record<string, string>[]): Record<string, string> {
  return headersList.reduce((acc, headers) => ({ ...acc, ...headers }), {});
}

// Utility function to return an HTML response
export function html(
  body: string,
  status: number = 200,
  ...headersList: Record<string, string>[] // Accept multiple header objects
): Response {
  return new Response(body, {
    status: status,
    headers: merge({ "content-type": "text/html" }, ...headersList), // Merge all headers
  });
}

// Utility function to return a JSON response
export function json(
  data: unknown,
  status: number = 200,
  ...headersList: Record<string, string>[] // Accept multiple header objects
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: merge({ "content-type": "application/json" }, ...headersList), // Merge all headers
  });
}


// Utility function to create a cookie as a header object
export function makeCookie(
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
): Record<string, string> {
  let cookieValue = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options.path) cookieValue += `; Path=${options.path}`;
  if (options.domain) cookieValue += `; Domain=${options.domain}`;
  if (options.maxAge !== undefined) cookieValue += `; Max-Age=${options.maxAge}`;
  if (options.expires) cookieValue += `; Expires=${options.expires.toUTCString()}`;
  if (options.secure) cookieValue += `; Secure`;
  if (options.httpOnly) cookieValue += `; HttpOnly`;
  if (options.sameSite) cookieValue += `; SameSite=${options.sameSite}`;

  return { "Set-Cookie": cookieValue }; // Return as a header object
}

// Utility function to delete a cookie
export function deleteCookie(name: string, path: string = "/"): Record<string, string> {
  return { "Set-Cookie": `${encodeURIComponent(name)}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT` };
}

type Middleware = (ctx: Context, next: () => Promise<Response>) => Promise<Response>;
type Handler = (ctx: Context) => Promise<Response>;

type RouteNode = {
  children: Record<string, RouteNode>;
  wildcard?: RouteNode; // Added for wildcard routes
  handlers: Partial<Record<string, { regex: RegExp, handlers: Middleware[], finalHandler: Handler }>>;
};

export type Context = {
  req: Request;
  params: Record<string, string>;
  store: Record<string, unknown>;
};


export async function logger(ctx: Context, next: () => Promise<Response>): Promise<Response> {
  const startTime = performance.now();
  const response = await next();
  const endTime = performance.now();
  const timeTaken = (endTime - startTime).toFixed(2);
  console.log(`[${ctx.req.method}][${new URL(ctx.req.url).pathname}][${timeTaken}ms]`);
  return response;
}

export class Xerus {
  private trie: RouteNode = { children: {}, handlers: {} };

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

  async handleRequest(req: Request): Promise<Response | null> {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const segments = pathname.split('/').filter(Boolean);
  
    let node: RouteNode | null = this.trie;
    let context: Context = { req, params: {}, store: {} }; // Attach req to context
  
    let wildcardMatch: string | null = null;
  
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
  
      if (node.children[segment]) {
        node = node.children[segment];
      } else if (node.wildcard) {
        wildcardMatch = segments.slice(i).join('/'); // Capture remaining path
        node = node.wildcard;
        break; // Stop further traversal since wildcard captures everything after
      } else {
        const paramKey: any = Object.keys(node.children).find(k => k.startsWith(':'));
        if (paramKey) {
          context.params[paramKey.slice(1)] = segment;
          node = node.children[paramKey];
        } else {
          return null; // No matching route found
        }
      }
    }
  
    const methodHandlers = node.handlers[req.method];
    if (!methodHandlers) return null;
  
    if (wildcardMatch) {
      context.params['*'] = wildcardMatch; // Store wildcard match in params
    }
  
    return this.runMiddlewares(
      [...methodHandlers.handlers, async (ctx: Context) => methodHandlers.finalHandler(ctx)], 
      context
    );
  }
  

  private async runMiddlewares(handlers: (Middleware | Handler)[], ctx: Context): Promise<Response> {
    let index = -1;
    const next = async (): Promise<Response> => {
        index++;
        if (index >= handlers.length) {
            return new Response("Unexpected server error", { status: 500 });
        }
        try {
            return handlers[index](ctx, next);
        } catch (err) {
            console.error("Middleware error:", err);
            return new Response("Internal Server Error", { status: 500 });
        }
    };
    return next();
}
  
}


