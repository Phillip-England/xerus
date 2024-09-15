import type { BunFile } from "bun";
import ReactDOMServer from "react-dom/server";

function searchObjectForDynamicPath(
  obj: Object,
  path: string,
  c: XerusContext,
): string {
  for (const key in obj) {
    if (!key.includes("{") && !key.includes("}")) {
      continue;
    }
    let pathParts = path.split("/");
    let keyParts = key.split("/");
    if (pathParts.length != keyParts.length) {
      continue;
    }
    let newPathParts: string[] = [];
    let noBrackets = keyParts.filter((str, i) => {
      if (str.includes("{") && str.includes("}")) {
        let pathPartObjKey = str.slice(1, -1);
        c.urlContext[pathPartObjKey] = i;
        return false;
      }
      newPathParts.push(pathParts[i]);
      return true;
    });
    for (let i = 0; i < newPathParts.length; i++) {
      let k = noBrackets[i];
      let p = newPathParts[i];
      if (k != p) {
        break;
      }
      if (i == newPathParts.length - 1) {
        return key;
      }
    }
  }
  return "";
}

export type XerusHandler = (c: XerusContext) => Promise<void>;
export type XerusMiddleware = (
  c: XerusContext,
  next: XerusHandler,
) => Promise<void>;

export class Xerus {
  routes: { [key: string]: XerusHandler };
  prefixMiddleware: { [key: string]: XerusMiddleware[] };
  notFound: XerusHandler;
  timeoutDuration: number;
  staticDir: string;
  globalContext: { [key: string]: any };

  constructor() {
    this.routes = {};
    this.prefixMiddleware = {};
    this.notFound = async (c: XerusContext) => {
      c.status(404);
      c.text("404 not found");
    };
    this.timeoutDuration = 5000;
    this.staticDir = "/static";
    this.globalContext = {};
  }

  setNotFound(fn: XerusHandler) {
    this.notFound = fn;
  }

  setStaticDir(dirPath: string) {
    this.staticDir = dirPath;
  }

  async handleStatic(path: string) {
    return this.wrapWithMiddleware(this.staticDir, async (c: XerusContext) => {
      let f = Bun.file("." + path);
      let exists = await f.exists();
      if (exists) {
        c.file(f);
      } else {
        await this.notFound(c);
      }
    });
  }

  use(pathPrefix: string, ...middleware: XerusMiddleware[]) {
    this.prefixMiddleware[pathPrefix] = middleware;
  }

  wrapWithMiddleware(
    path: string,
    handler: XerusHandler,
    ...middleware: XerusMiddleware[]
  ) {
    let combinedMiddleware = [...(this.prefixMiddleware["*"] || [])];
    for (const key in this.prefixMiddleware) {
      if (path.startsWith(key)) {
        combinedMiddleware.push(...this.prefixMiddleware[key]);
        break;
      }
    }
    combinedMiddleware.push(...middleware);
    return async (c: XerusContext) => {
      let index = 0;
      const executeMiddleware = async () => {
        if (index < combinedMiddleware.length) {
          await combinedMiddleware[index++](c, executeMiddleware);
        } else {
          await handler(c);
        }
      };
      await executeMiddleware();
    };
  }

  at(path: string, handler: XerusHandler, ...middleware: XerusMiddleware[]) {
    const wrappedHandler = this.wrapWithMiddleware(
      path,
      handler,
      ...middleware,
    );
    this.routes[path] = wrappedHandler;
  }

  get(path: string, handler: XerusHandler, ...middleware: XerusMiddleware[]) {
    this.at("GET " + path, handler, ...middleware);
  }

  post(path: string, handler: XerusHandler, ...middleware: XerusMiddleware[]) {
    this.at("POST " + path, handler, ...middleware);
  }

  put(path: string, handler: XerusHandler, ...middleware: XerusMiddleware[]) {
    this.at("PUT " + path, handler, ...middleware);
  }

  delete(
    path: string,
    handler: XerusHandler,
    ...middleware: XerusMiddleware[]
  ) {
    this.at("DELETE " + path, handler, ...middleware);
  }

  async handleRequest(req: Request) {
    let path = new URL(req.url).pathname;
    let c = new XerusContext(req, this.globalContext, this.timeoutDuration);
    let method = req.method;
    let methodPath = `${method} ${path}`;

    // handling static files
    if (path.startsWith(this.staticDir + "/") || path == "/favicon.ico") {
      let staticHandler = await this.handleStatic(path);
      await staticHandler(c);
      return c.respond();
    }

    // regular handlers
    let handler = this.routes[methodPath];
    if (handler) {
      await handler(c);
      return c.respond();
    }

    // dynamic handlers
    let key = searchObjectForDynamicPath(this.routes, methodPath, c);
    let dynamicHandler = this.routes[key];
    if (dynamicHandler) {
      await dynamicHandler(c);
      return c.respond();
    }

    // no handler found
    if (this.notFound) {
      await this.notFound(c);
      return c.respond();
    } else {
      // default 404 (should never happen, as default is set upon construction)
      return new Response("404 not found", { status: 404 });
    }
  }

  setTimeoutDuration(milliseconds: number) {
    this.timeoutDuration = milliseconds;
  }

  global(someKey: string, someValue: any) {
    this.globalContext[someKey] = someValue;
  }

  async run(port: number) {
    console.log(`🚀 blasting off on port ${port}!`);
    Bun.serve({
      port: port,
      fetch: async (req) => {
        return await this.handleRequest(req);
      },
    });
  }
}

export class XerusContext {
  url: URL;
  path: string;
  req: Request;
  res: XerusResponse;
  timeoutDuration: number;
  isReady: Boolean;
  globalContext: { [key: string]: any };
  urlContext: { [key: string]: number };

  constructor(req: Request, globalContext: Object, timeoutDuration: number) {
    this.url = new URL(req.url);
    this.path = this.url.pathname;
    this.req = req;
    this.res = new XerusResponse();
    this.timeoutDuration = timeoutDuration;
    this.isReady = false;
    this.globalContext = globalContext;
    this.urlContext = {};
  }

  respond(): Response {
    if (!this.isReady) {
      return new Response("response body not set", {
        status: 500,
      });
    }
    return new Response(this.res.body, {
      headers: this.res.headers,
      status: this.res.status,
    });
  }

  async form(): Promise<FormData> {
    return await this.req.formData();
  }

  setHeader(key: string, value: string) {
    this.res.headers[key] = value;
  }

  status(code: number) {
    this.res.status = code;
    this.ready();
  }

  ready() {
    this.isReady = true;
  }

  html(str: string) {
    this.setHeader("Content-Type", "text/html");
    this.ready();
  }

  redirect(path: string) {
    this.setHeader("Location", path);
    this.status(303);
    this.ready();
  }

  json(obj: Object) {
    let jsonObj = JSON.stringify(obj);
    this.setHeader("Content-Type", "application/json");
    this.res.body = jsonObj;
    this.ready();
  }

  jsx(component: React.ReactNode) {
    this.setHeader("Content-Type", "text/html");
    this.res.body = ReactDOMServer.renderToString(component);
    this.ready();
  }

  async file(file: BunFile): Promise<void> {
    const fileContent = await file.text();
    this.res.body = fileContent;
    this.res.headers["Content-Type"] = file.type;
    this.isReady = true;
  }

  param(paramName: string): string {
    return this.url.searchParams.get(paramName) || "";
  }

  getGlobal(someKey: string): any {
    return this.globalContext[someKey];
  }

  dyn(key: string): string {
    let arrIndex = this.urlContext[key];
    let path = new URL(this.req.url).pathname;
    let parts = path.split("/");
    return parts[arrIndex];
  }

  text(message: string): void {
    this.res.body = message;
    this.setHeader("Content-Type", "text/plain");
    this.ready();
  }
}

export class XerusResponse {
  headers: { [key: string]: string };
  body: string;
  status: number;

  constructor() {
    this.headers = {};
    this.body = "";
    this.status = 200;
  }
}

export async function logger(c: XerusContext, next: XerusHandler) {
  let startTime = process.hrtime();
  await next(c);
  let endTime = process.hrtime(startTime);
  let totalTime = endTime[0] * 1e3 + endTime[1] / 1e6;
  console.log(`[${c.req.method}][${c.path}][${totalTime.toFixed(3)}ms]`);
}

export async function timeout(c: XerusContext, next: XerusHandler) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("request timed out"));
    }, c.timeoutDuration);
  });
  try {
    await Promise.race([next(c), timeoutPromise]);
  } catch (err: any) {
    if (err.message == "request timed out") {
      c.status(504);
      c.setHeader("Content-Type", "application/json");
      c.json({
        error: "request timed out",
      });
    }
  }
}