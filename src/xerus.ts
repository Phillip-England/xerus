import { join } from "path";
import { existsSync } from "fs";

// Utility function to convert a path into a regex
function pathToRegex(path: string): RegExp {
  return new RegExp("^" + path.replace(/:\w+/g, "([^/]+)").replace(/\*/g, ".*") + "/?$");
}

// Utility function to merge multiple records into one
export function merge(...headersList: Record<string, string>[]): Record<string, string> {
  return headersList.reduce((acc, headers) => ({ ...acc, ...headers }), {});
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

export function staticHandler(staticDir: string) {
  return async (c: Context): Promise<Response> => {
    const url = new URL(c.req.url);
    const filePath = join(staticDir, url.pathname.replace(/^\/static\//, "")); // Resolve file path

    if (!existsSync(filePath)) {
      return new Response("404 Not Found", { status: 404 });
    }

    const file = Bun.file(filePath);
    return new Response(file, {
      headers: {
        "Content-Type": file.type || "application/octet",
        "Cache-Control": "max-age=3600", // Cache for 1 hour
        "ETag": `"${filePath}-${file.size}-${file.lastModified}"`,
      },
    });
  };
}


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
    // Set default values
    const {
      origin = "*",
      methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders = ["Content-Type", "Authorization"],
      exposedHeaders = [],
      credentials = false,
      maxAge = 86400, // 24 hours
    } = options;

    // Apply CORS headers
    ctx.headers["Access-Control-Allow-Origin"] = origin;
    ctx.headers["Access-Control-Allow-Methods"] = methods.join(", ");
    ctx.headers["Access-Control-Allow-Headers"] = allowedHeaders.join(", ");
    ctx.headers["Access-Control-Expose-Headers"] = exposedHeaders.join(", ");
    if (credentials && origin !== "*") {
      ctx.headers["Access-Control-Allow-Credentials"] = "true";
    }
    ctx.headers["Access-Control-Max-Age"] = maxAge.toString();

    // Handle preflight requests (OPTIONS)
    if (ctx.req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: ctx.headers });
    }

    return await next();
  };
}


// Context class
export class Context {
  req: Request;
  params: Record<string, string> = {};
  store: Record<string, unknown> = {};
  query: Record<string, string>;
  headers: Record<string, string> = {};

  constructor(req: Request) {
    this.req = req;
    this.query = Object.fromEntries(new URL(req.url).searchParams.entries());
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

    if (!this.headers["Set-Cookie"]) {
      this.headers["Set-Cookie"] = cookieValue;
    } else {
      this.headers["Set-Cookie"] += `, ${cookieValue}`; // Append multiple cookies
    }
  }

  deleteCookie(name: string, path: string = "/") {
    this.setCookie(name, "", { path, expires: new Date(0) });
  }

  html(body: string, status: number = 200): Response {
    return new Response(body, { status, headers: merge({ "Content-Type": "text/html" }, this.headers) });
  }

  json(data: unknown, status: number = 200): Response {
    return new Response(JSON.stringify(data), { status, headers: merge({ "Content-Type": "application/json" }, this.headers) });
  }
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
    let ctx = new Context(req);

    let wildcardMatch: string | null = null;
    let paramMatches: { [key: string]: string } = {};
  
    let exactMatchNode: RouteNode | null = node;
    let paramMatchNode: RouteNode | null = null;
    let wildcardNode: RouteNode | null = null;
  
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
  
      if (exactMatchNode?.children[segment]) {
        exactMatchNode = exactMatchNode.children[segment];
      } else {
        exactMatchNode = null;
      }
  
      const paramKey: any = Object.keys(node.children).find(k => k.startsWith(":"));
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
    if (!matchedNode) return new Response("Not Found", { status: 404 });
  
    const methodHandlers = matchedNode.handlers[req.method];
    if (!methodHandlers) return new Response("Method Not Allowed", { status: 405 });

    ctx.params = { ...ctx.params, ...paramMatches };
    if (wildcardMatch) {
      ctx.params["*"] = wildcardMatch;
    }

    return this.runMiddlewares(
      [...methodHandlers.handlers, async (c: Context) => methodHandlers.finalHandler(c)], 
      ctx
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
        return this.handleError(ctx, err);
      }
    };
    return next();
  }
  
  private handleError(ctx: Context, err: unknown): Response {
    return new Response("Internal Server Error", { status: 500 });
  }
}
