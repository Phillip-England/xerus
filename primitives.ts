//==============================
// cookies
//==============================

export interface CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

//==============================
// context
//==============================

export enum BodyType {
  JSON = "json",
  TEXT = "string",
  FORM = "form",
  MULTIPART_FORM = "multipart_form",
}

export class Context {
  req: Request;
  res: MutResponse;
  url: URL;
  path: string;
  method: string;
  route: string;
  segments: string[];
  params: Record<string, string>;
  private _body?: string | Record<string, any> | FormData;
  storeData: Record<string, string>;

  constructor(req: Request, params: Record<string, string> = {}) {
    this.req = req;
    this.res = new MutResponse();
    this.url = new URL(this.req.url);
    this.path = this.url.pathname.replace(/\/+$/, "") || "/";
    this.method = this.req.method;
    this.route = `${this.method} ${this.path}`;
    this.segments = this.path.split("/").filter(Boolean);
    this.params = params;
    this.storeData = {};
  }

  redirect(location: string, status: number = 302): Response {
    this.res.status(status);
    this.res.setHeader("Location", location);
    return this.res.send();
  }

  async parseBody<T extends BodyType>(
    expectedType: T,
  ): Promise<
    T extends BodyType.JSON ? Record<string, any>
      : T extends BodyType.TEXT ? string
      : T extends BodyType.FORM ? Record<string, string>
      : T extends BodyType.MULTIPART_FORM ? FormData
      : never
  > {
    if (this._body !== undefined) {
      return this._body as any;
    }

    const contentType = this.req.headers.get("Content-Type") || "";

    try {
      let parsedData: any;

      if (contentType.includes("application/json")) {
        parsedData = await this.req.json();
        if (expectedType !== BodyType.JSON) {
          throw new Error("Unexpected JSON data");
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        parsedData = Object.fromEntries(
          new URLSearchParams(await this.req.text()),
        );
        if (expectedType !== BodyType.FORM) {
          throw new Error("Unexpected FORM data");
        }
      } else if (contentType.includes("multipart/form-data")) {
        parsedData = await this.req.formData();
        if (expectedType !== BodyType.MULTIPART_FORM) {
          throw new Error("Unexpected MULTIPART_FORM data");
        }
      } else {
        parsedData = await this.req.text();
        if (expectedType !== BodyType.TEXT) {
          throw new Error("Unexpected TEXT data");
        }
      }

      this._body = parsedData;
      return parsedData;
    } catch (err: any) {
      throw new Error(`Body parsing failed: ${err.message}`);
    }
  }

  param(name: string, defaultValue?: string): string | undefined {
    return this.params[name] ?? defaultValue;
  }

  status(code: number): this {
    this.res.status(code);
    return this;
  }

  setHeader(name: string, value: string): this {
    this.res.setHeader(name, value);
    return this;
  }

  getHeader(name: string): string | null {
    return this.res.getHeader(name);
  }

  send(content: string): Response {
    return this.res.body(content).send();
  }

  html(content: string): Response {
    this.setHeader("Content-Type", "text/html");
    return this.send(content);
  }

  text(content: string): Response {
    this.setHeader("Content-Type", "text/plain");
    return this.send(content);
  }

  json(data: any): Response {
    this.setHeader("Content-Type", "application/json");
    return this.send(JSON.stringify(data));
  }

  async stream(stream: ReadableStream): Promise<Response> {
    this.setHeader("Content-Type", "application/octet-stream");
    return new Response(stream, {
      status: this.res.statusCode,
      headers: this.res.headers,
    });
  }

  async file(filePath: string, stream = false): Promise<Response | undefined> {
    const file = Bun.file(filePath);
    if (!file) return undefined;

    this.res.setHeader("Content-Type", file.type || "application/octet-stream");
    return stream
      ? new Response(file.stream(), {
        status: this.res.statusCode,
        headers: this.res.headers,
      })
      : new Response(file, {
        status: this.res.statusCode,
        headers: this.res.headers,
      });
  }

  setStore(key: string, value: any): void {
    this.storeData[key] = value;
  }

  getStore(key: string): any {
    return this.storeData[key] || undefined;
  }

  query(name: string, defaultValue: string = ""): string {
    return this.url.searchParams.get(name) ?? defaultValue;
  }

  getCookie(name: string): string | undefined {
    const cookies = this.req.headers.get("Cookie");
    if (!cookies) return undefined;

    const cookieMap = Object.fromEntries(
      cookies.split("; ").map((c) => c.split("=")),
    );

    return cookieMap[name];
  }

  setCookie(name: string, value: string, options: CookieOptions = {}): void {
    let cookieString = `${name}=${encodeURIComponent(value)}`;

    if (options.path) cookieString += `; Path=${options.path}`;
    if (options.domain) cookieString += `; Domain=${options.domain}`;
    if (options.maxAge !== undefined) {
      cookieString += `; Max-Age=${options.maxAge}`;
    }
    if (options.expires) {
      cookieString += `; Expires=${options.expires.toUTCString()}`;
    }
    if (options.httpOnly) cookieString += `; HttpOnly`;
    if (options.secure) cookieString += `; Secure`;
    if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;

    // Fix: Use append instead of setHeader to allow multiple cookies
    this.res.headers.append("Set-Cookie", cookieString);
  }

  clearCookie(name: string, path: string = "/", domain?: string): void {
    this.setCookie(name, "", {
      maxAge: 0,
      expires: new Date(0),
      path: path,
      domain: domain, // Match the domain of the original cookie
    });
  }
}

//==============================
// handler
//==============================

type HandlerFunc = (c: Context) => Promise<Response>;

export class Handler {
  private mainHandler: HandlerFunc;
  private middlewares: Middleware[];
  private compiledChain: (c: Context) => Promise<Response>;

  constructor(mainHandler: HandlerFunc) {
    this.mainHandler = mainHandler;
    this.middlewares = [];
    this.compiledChain = async (c: Context) => await this.mainHandler(c); // Default
  }

  setMiddlewares(middlewares: Middleware[]) {
    this.middlewares = middlewares;
    this.precompileChain();
  }

  private precompileChain() {
    let chain = async (context: Context): Promise<Response> => {
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
      chain = async (context: Context): Promise<Response> => {
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

  async execute(c: Context): Promise<Response> {
    return this.compiledChain(c); // Use precompiled middleware chain
  }
}

//==============================
// middleware
//==============================

export type MiddlewareFn = (
  c: Context,
  next: () => Promise<void | Response>,
) => Promise<void | Response>;

export class Middleware {
  private callback: MiddlewareFn;

  constructor(callback: MiddlewareFn) {
    this.callback = callback;
  }

  async execute(
    c: Context,
    next: () => Promise<void | Response>,
  ): Promise<void | Response> {
    return this.callback(c, next);
  }
}

// Example middleware using the new class
export const logger = new Middleware(async (c: Context, next) => {
  const start = performance.now();
  await next();
  const duration = performance.now() - start;
  console.log(`[${c.req.method}][${c.path}][${duration.toFixed(2)}ms]`);
});

export class MutResponse {
  statusCode: number;
  headers: Headers;
  bodyContent: string;

  constructor() {
    this.statusCode = 200;
    this.headers = new Headers();
    this.bodyContent = "";
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string): this {
    this.headers.set(name, value);
    return this;
  }

  getHeader(name: string): string | null {
    return this.headers.get(name);
  }

  body(content: string | object): this {
    this.bodyContent = typeof content === "object"
      ? JSON.stringify(content)
      : content;
    return this;
  }

  send(): Response {
    return new Response(this.bodyContent, {
      status: this.statusCode,
      headers: this.headers,
    });
  }
}

//==============================
// router
//==============================

class TrieNode {
  handlers: Record<string, Handler> = {}; // Replacing Map with object
  children: Record<string, TrieNode> = {}; // Replacing Map with object
  paramKey?: string;
  wildcard?: TrieNode;
}

export class RouteGroup {
  app: Xerus;
  prefixPath: string;
  middlewares: Middleware[];
  constructor(app: Xerus, prefixPath: string, ...middlewares: Middleware[]) {
    this.app = app;
    this.prefixPath = prefixPath;
    this.middlewares = middlewares;
  }

  get(path: string, handler: HandlerFunc) {
    this.app.get(this.prefixPath + path, handler, ...this.middlewares);
  }
  post(path: string, handler: HandlerFunc) {
    this.app.post(this.prefixPath + path, handler, ...this.middlewares);
  }
  put(path: string, handler: HandlerFunc) {
    this.app.put(this.prefixPath + path, handler, ...this.middlewares);
  }
  delete(path: string, handler: HandlerFunc) {
    this.app.delete(this.prefixPath + path, handler, ...this.middlewares);
  }
  patch(path: string, handler: HandlerFunc) {
    this.app.patch(this.prefixPath + path, handler, ...this.middlewares);
  }
}

export class Xerus {
  DEBUG_MODE = false;
  private root: TrieNode = new TrieNode();
  private routes: Record<string, Handler> = {}; // Replacing Map with object
  private globalMiddlewares: Middleware[] = [];
  private notFoundHandler?: Handler;
  private errHandler?: Handler;
  private resolvedRoutes: Record<string, { handler?: Handler; params: Record<string, string> }> = {}; // Replacing Map with object
  private readonly MAX_CACHE_SIZE = 100;

  use(...middlewares: Middleware[]) {
    this.globalMiddlewares.push(...middlewares);
  }

  group(prefixPath: string, ...middlewares: Middleware[]) {
    return new RouteGroup(this, prefixPath, ...middlewares);
  }

  onErr(handlerFunc: HandlerFunc, ...middlewares: Middleware[]) {
    let handler = new Handler(handlerFunc);
    handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));
    this.errHandler = handler;
  }

  onNotFound(handlerFunc: HandlerFunc, ...middlewares: Middleware[]) {
    let handler = new Handler(handlerFunc);
    handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));
    this.notFoundHandler = handler;
  }

  private register(method: string, path: string, handlerFunc: HandlerFunc, middlewares: Middleware[]) {
    let handler = new Handler(handlerFunc);
    handler.setMiddlewares(this.globalMiddlewares.concat(middlewares));

    if (!path.includes(":") && !path.includes("*")) {
      this.routes[`${method} ${path}`] = handler;
      return;
    }

    // Optimized Trie Insertion
    const parts = path.split("/").filter(Boolean);
    let node = this.root;

    for (const part of parts) {
      let isParam = part.startsWith(":");
      let isWildcard = part === "*";

      if (isParam) {
        node = node.children[":param"] ?? (node.children[":param"] = new TrieNode());
        node.paramKey ||= part.slice(1);
      } else if (isWildcard) {
        node.wildcard = node.wildcard ?? new TrieNode();
        node = node.wildcard;
      } else {
        node = node.children[part] ?? (node.children[part] = new TrieNode());
      }
    }

    if (node.handlers[method]) {
      throw new Error(`Route ${method} ${path} has already been registered`);
    }
    node.handlers[method] = handler;
  }

  get(path: string, handler: HandlerFunc, ...middlewares: Middleware[]) {
    this.register("GET", path, handler, middlewares);
    return this;
  }

  post(path: string, handler: HandlerFunc, ...middlewares: Middleware[]) {
    this.register("POST", path, handler, middlewares);
    return this;
  }

  put(path: string, handler: HandlerFunc, ...middlewares: Middleware[]) {
    this.register("PUT", path, handler, middlewares);
    return this;
  }

  delete(path: string, handler: HandlerFunc, ...middlewares: Middleware[]) {
    this.register("DELETE", path, handler, middlewares);
    return this;
  }

  patch(path: string, handler: HandlerFunc, ...middlewares: Middleware[]) {
    this.register("PATCH", path, handler, middlewares);
    return this;
  }

  find(req: Request): { handler?: Handler; c: Context } {
    const { method } = req;
    const url = new URL(req.url);
    const path = url.pathname;

    if (this.routes[`${method} ${path}`]) {
      return { handler: this.routes[`${method} ${path}`], c: new Context(req) };
    }

    const cacheKey = `${method} ${path}`;
    if (this.resolvedRoutes[cacheKey]) {
      return { handler: this.resolvedRoutes[cacheKey].handler, c: new Context(req, this.resolvedRoutes[cacheKey].params) };
    }

    const parts = path.split("/").filter(Boolean);
    let node: TrieNode | undefined = this.root;
    let params: Record<string, string> = {};

    for (const part of parts) {
      let nextNode: TrieNode | undefined = node.children[part] ?? node.children[":param"];

      if (nextNode) {
        if (nextNode.paramKey) {
          params[nextNode.paramKey] = part;
        }
        node = nextNode;
      } else if (node.wildcard) {
        node = node.wildcard;
        break;
      } else {
        return { handler: undefined, c: new Context(req) };
      }
    }

    const matchedHandler = node.handlers[method];
    if (!matchedHandler) {
      return { handler: undefined, c: new Context(req) };
    }

    if (Object.keys(this.resolvedRoutes).length >= this.MAX_CACHE_SIZE) {
      delete this.resolvedRoutes[Object.keys(this.resolvedRoutes)[0]];
    }

    this.resolvedRoutes[cacheKey] = { handler: matchedHandler, params };
    return { handler: matchedHandler, c: new Context(req, params) };
  }

  async run(req: Request): Promise<Response> {
    try {
      const { handler, c } = this.find(req);
      if (handler) return await handler.execute(c);
      return this.notFoundHandler ? this.notFoundHandler.execute(new Context(req)) : new Response("404 Not Found", { status: 404 });
    } catch (e: any) {
      if (this.DEBUG_MODE) console.error(e);
      return this.errHandler ? this.errHandler.execute(new Context(req)) : new Response("internal server error", { status: 500 });
    }
  }

}


//=============================
// errors
//=============================
