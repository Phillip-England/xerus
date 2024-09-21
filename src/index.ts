import type { BunFile } from "bun";
import ReactDOMServer from "react-dom/server";
import { readdir } from "node:fs/promises";

type PotentialErr = Error | void;

export class Result<T, E> {
  private constructor(
    private readonly _value?: T,
    private readonly _error?: E,
  ) {}

  // Static method to create a successful result
  static Ok<T, E = never>(value: T): Result<T, E> {
    return new Result<T, E>(value);
  }

  // Static method to create an error result
  static Err<E, T = never>(error: E): Result<T, E> {
    return new Result<T, E>(undefined, error);
  }

  // Check if result is Ok (success)
  isOk(): boolean {
    return this._error === undefined;
  }

  // Check if result is Err (failure)
  isErr(): boolean {
    return this._value === undefined;
  }

  // Get the success value (throws if there's an error)
  unwrap(): T {
    if (this.isErr()) {
      throw new Error("Tried to unwrap an Err value");
    }
    return this._value as T;
  }

  // Get the error value (throws if there's no error)
  unwrapErr(): E {
    if (this.isOk()) {
      throw new Error("Tried to unwrap an Ok value");
    }
    return this._error as E;
  }

  // Get the value or provide a default
  unwrapOr(defaultValue: T): T {
    return this.isOk() ? (this._value as T) : defaultValue;
  }

  // Get the error value without throwing, returns undefined if no error
  getErr(): E | undefined {
    return this.isErr() ? this._error : undefined;
  }
}

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

export class XerusRoute {
  handler: XerusHandler;
  middleware: XerusMiddleware[];

  constructor(handler: XerusHandler, ...middleware: XerusMiddleware[]) {
    this.handler = handler;
    this.middleware = middleware;
  }
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

    // Collect middleware that applies to this specific path
    for (const key in this.prefixMiddleware) {
      let pathParts = path.split(" ");
      if (pathParts[1].startsWith(key)) {
        combinedMiddleware.push(...this.prefixMiddleware[key]);
        break;
      }
    }

    combinedMiddleware.push(...middleware);

    return async (c: XerusContext) => {
      let index = 0;

      // Middleware execution function
      const executeMiddleware = async () => {
        while (index < combinedMiddleware.length) {
          await combinedMiddleware[index++](c, executeMiddleware);

          // Check if XerusContext is ready, if so break out of the chain
          if (c.isReady) {
            return; // Terminate middleware chain early if response is already handled
          }
        }

        // If all middleware has run and the context is not ready, call the handler
        if (!c.isReady) {
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

  async handleRequest(req: Request): Promise<Response | Error> {
    let path: string = new URL(req.url).pathname;
    let c = new XerusContext(req, this.globalContext, this.timeoutDuration);
    let method: string = req.method;
    let methodPath = `${method} ${path}`;

    // handling static files
    if (path.startsWith(this.staticDir + "/") || path == "/favicon.ico") {
      let staticHandler: XerusHandler = await this.handleStatic(path);
      await staticHandler(c);
      return c.respond();
    }

    // regular handlers
    let handler = this.routes[methodPath];
    if (handler) {
      try {
        await handler(c);
        return c.respond();
      } catch (e: any) {
        return e as Error;
      }
    }

    // dynamic handlers
    let key = searchObjectForDynamicPath(this.routes, methodPath, c);
    let dynamicHandler = this.routes[key];
    if (dynamicHandler) {
      try {
        await dynamicHandler(c);
        return c.respond();
      } catch (e: any) {
        return e as Error;
      }
    }

    // no handler found
    if (this.notFound) {
      try {
        await this.notFound(c);
        return c.respond();
      } catch (e: any) {
        return e as Error;
      }
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
        let res: Response | Error = await this.handleRequest(req);

        // Check if `res` is an Error
        if (res instanceof Error) {
          console.error("An error occurred:", res);
          return new Response("Internal Server Error", { status: 500 });
        }

        // Otherwise, return the response
        return res;
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

  stream(
    streamer: () => ReadableStream<Uint8Array>,
    contentType: string = "text/plain",
  ) {
    this.setHeader("Content-Type", contentType);

    const reader = streamer().getReader(); // Get a reader to consume the stream

    const decoder = new TextDecoder(); // For converting chunks to string
    this.res.body = ""; // Initialize as an empty string

    const readChunk = async () => {
      let done: boolean, value: Uint8Array | undefined;

      // Keep reading chunks until the stream is done
      do {
        ({ done, value } = await reader.read());

        if (value !== undefined) {
          // Check if value is not undefined
          this.res.body += decoder.decode(value, { stream: true }); // Append chunks to body
        }
      } while (!done);

      // Once the stream ends, mark the response as ready
      this.isReady = true;
    };

    readChunk().catch((err) => {
      console.error("Error streaming response:", err);
      this.res.body = "Error occurred during streaming";
      this.isReady = true;
    });
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

export class FileBasedRouter {
  app: Xerus;
  targetDir: string;
  indexFilePath: string[];

  constructor(app: Xerus) {
    this.app = app;
    this.targetDir = "./app";
    this.indexFilePath = [`+page.ts`, "+page.tsx"];
  }

  async mount(): Promise<PotentialErr> {
    try {
      const fileNames = await readdir(this.targetDir, { recursive: true });
      let err = this.verifyIndex(fileNames);
      if (err) {
        return err;
      }
      let filteredFileNames = this.weedOutDirs(fileNames);
      let routeMap = this.makeRouteMap(filteredFileNames);
      let result = await this.extractModules(routeMap);
      if (result.isErr()) {
        return result.getErr();
      }
      let moduleArr = result.unwrap();
      this.hookRoutes(moduleArr);
    } catch (e: any) {
      return e as Error;
    }
  }

  verifyIndex(fileNames: string[]): PotentialErr {
    let foundIndex = false;
    for (let i = 0; i < fileNames.length; i++) {
      let fileName = fileNames[i];
      if (this.indexFilePath.includes(fileName)) {
        foundIndex = true;
        break;
      }
    }
    if (!foundIndex) {
      return new Error(
        `failed to located index at ${this.targetDir}/${this.indexFilePath}`,
      );
    }
  }

  weedOutDirs(fileNames: string[]): string[] {
    let filteredFileNames = fileNames.filter((value, index) => {
      for (let i = 0; i < this.indexFilePath.length; i++) {
        let validFileName = this.indexFilePath[i];
        if (value.includes(validFileName)) {
          return true;
        }
      }
      return false;
    });
    return filteredFileNames;
  }

  makeRouteMap(filteredFileNames: string[]): { [key: string]: string } {
    let routeMap: { [key: string]: string } = {};
    for (let i = 0; i < filteredFileNames.length; i++) {
      let fileName = filteredFileNames[i];
      if (this.indexFilePath.includes(fileName)) {
        routeMap["/"] = fileName;
        continue;
      }
      let parts = fileName.split("/");
      parts.pop();
      let endpoint = "/" + parts.join("/");
      routeMap[endpoint] = fileName;
    }
    return routeMap;
  }

  async extractModules(routeMap: {
    [key: string]: string;
  }): Promise<Result<any[], Error>> {
    try {
      let routeArr: any = [];
      Object.entries(routeMap).forEach(async ([endpoint, filePath]) => {
        let moduleFilePath = "." + this.targetDir + "/" + filePath;
        routeArr.push({
          modulePath: moduleFilePath,
          endpoint: endpoint,
        });
      });
      let finalArr: any = [];
      for (let i = 0; i < routeArr.length; i++) {
        let { modulePath, endpoint } = routeArr[i];
        let module = await import(modulePath);
        finalArr.push({
          module: module,
          endpoint: endpoint,
        });
      }
      return Result.Ok(finalArr);
    } catch (e: any) {
      return Result.Err(e);
    }
  }

  hookRoutes(moduleArr: any[]) {
    for (let i = 0; i < moduleArr.length; i++) {
      let { module, endpoint } = moduleArr[i];

      // here is where we determine our endpoints prefix middleware
      // an important distinction is made here
      // if a route ends with a dynamic value such as /user/{id}
      // then all prefix middleware will be applied to "/user/"
      // but endpoint which do not end in a dynamic value will be applied as expected
      if (module.use) {
        let parts = endpoint.split("/");
        let lastPart = parts[parts.length - 1];
        if (lastPart.includes("{") && lastPart.includes("}")) {
          parts.pop();
          this.app.use(parts.join("/"), ...module.use);
        } else {
          this.app.use(endpoint, ...module.use);
        }
      }

      if (module.get) {
        this.app.get(endpoint, module.get.handler, module.get.middleware || []);
      }

      if (module.post) {
        this.app.post(
          endpoint,
          module.post.handler,
          module.post.middleware || [],
        );
      }

      if (module.put) {
        this.app.put(endpoint, module.put.handler, module.put.middleware || []);
      }

      if (module.delete) {
        this.app.delete(
          endpoint,
          module.delete.handler,
          module.delete.middleware || [],
        );
      }
    }
  }
}
