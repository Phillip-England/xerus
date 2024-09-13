import { XerusContext } from "./XerusContext";

function searchObjectForDynamicPath(obj, path, c) {
  for (const key in obj) {
    if (!key.includes("{") && !key.includes("}")) {
      continue;
    }
    let pathParts = path.split("/");
    let keyParts = key.split("/");
    if (pathParts.length != keyParts.length) {
      continue;
    }
    let newPathParts = [];
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

export class Xerus {
  constructor() {
    this.routes = {};
    this.prefixMiddleware = {};
    this.notFound = async (c) => {
      c.status(404);
      c.text("404 not found");
    };
    this.timeoutDuration = 5000;
    this.staticDir = "/static";
    this.globalContext = {};
  }

  setNotFound(fn) {
    this.notFound = fn;
  }

  setStaticDir(dirPath) {
    this.staticDir = dirPath;
  }

  async handleStatic(path) {
    return this.wrapWithMiddleware(this.staticDir, async (c) => {
      let f = await Bun.file("." + path);
      let exists = await f.exists();
      if (exists) {
        c.file(f);
      } else {
        await this.notFound(c);
      }
    });
  }

  use(pathPrefix, ...middleware) {
    this.prefixMiddleware[pathPrefix] = middleware;
  }

  wrapWithMiddleware(path, handler, ...middleware) {
    let combinedMiddleware = [...(this.prefixMiddleware["*"] || [])];
    for (const key in this.prefixMiddleware) {
      if (path.startsWith(key)) {
        combinedMiddleware.push(...this.prefixMiddleware[key]);
        break;
      }
    }
    combinedMiddleware.push(...middleware);
    return async (c) => {
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

  get(path, handler, ...middleware) {
    this.at("GET " + path, handler, ...middleware);
  }

  post(path, handler, ...middleware) {
    this.at("POST " + path, handler, ...middleware);
  }

  put(path, handler, ...middleware) {
    this.at("PUT " + path, handler, ...middleware);
  }

  delete(path, handler, ...middleware) {
    this.at("DELETE " + path, handler, ...middleware);
  }

  at(path, handler, ...middleware) {
    const wrappedHandler = this.wrapWithMiddleware(
      path,
      handler,
      ...middleware,
    );
    this.routes[path] = wrappedHandler;
  }

  async handleRequest(req) {
    let path = new URL(req.url).pathname;
    let c = new XerusContext(req, this.globalContext, this.timeoutDuration);
    let method = req.method;
    let methodPath = `${method} ${path}`;

    if (path.startsWith(this.staticDir + "/") || path == "/favicon.ico") {
      let staticHandler = await this.handleStatic(path);
      await staticHandler(c);
      return c.respond();
    }

    let handler = this.routes[methodPath];
    if (handler) {
      await handler(c);
      return c.respond();
    }

    let key = searchObjectForDynamicPath(this.routes, methodPath, c);
    let dynamicHandler = this.routes[key];
    if (dynamicHandler) {
      await dynamicHandler(c);
      return c.respond();
    }

    if (this.notFound) {
      await this.notFound(c);
      return c.respond();
    } else {
      return new Response("404 not found", { status: 404 });
    }
  }

  setTimeoutDuration(milliseconds) {
    this.timeoutDuration = milliseconds;
  }

  global(someKey, someValue) {
    this.globalContext[someKey] = someValue;
  }

  async run(port) {
    console.log(`🚀 blasting off on port ${port}!`);
    Bun.serve({
      port: port,
      fetch: async (req) => {
        return await this.handleRequest(req);
      },
    });
  }
}
