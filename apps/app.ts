import {
  BodyType,
  Context,
  Handler,
  logger,
  Middleware,
  Xerus,
} from "../xerus";

// define router
const app = new Xerus();

// setInterval(() => {
//   const usage = process.memoryUsage();
//   console.log(`Memory Usage: RSS: ${(usage.rss / 1024 / 1024).toFixed(2)} MB, Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
// }, 100);

app.DEBUG_MODE = true;

// app.use(logger);

let apiMiddleware = new Middleware(
  async (c: Context, next): Promise<void | Response> => {
    c.setStore("secretTreasure", "booty");
    next();
  },
);

app.group("/api", apiMiddleware)
  .get("/user/:id", async (c: Context) => {
    let userId = c.param("id");
    let storeValue = c.getStore("secretTreasure");
    return c.json({
      userId: userId,
      secret: storeValue,
    });
  });

app.get(
  "/person/melody",
  async (c: Context): Promise<Response> => {
    return c.html("<h1>Hello, Melody!</h1>");
  },
);

const mwOrderTest1 = new Middleware(async (c, next) => {
  console.log("Middleware 1 BEFORE");
  await next();
  console.log("Middleware 1 AFTER");
});

const mwOrderTest2 = new Middleware(async (c, next) => {
  console.log("Middleware 2 BEFORE");
  await next();
  console.log("Middleware 2 AFTER");
});

let mwStore = new Middleware(async (c, next) => {
  c.setStore("test", "testvalue");
  await next();
});

let mwNoNext = new Middleware(async (c, next) => {
  // i dont call next!
});

let mwEarlyResponse = new Middleware(async (c, next) => {
  console.log("mwEarlyResponse executing");
  const response = new Response("hello from middleware");
  console.log("mwEarlyResponse created response");
  return response;
});

app.get(
  "/",
  async (c: Context): Promise<Response> => {
    return c.json({ message: "Hello, world!" });
  },
);

app.get(
  "/context/html",
  async (c: Context): Promise<Response> => {
    return c.html("<h1>Hello, World!</h1>");
  },
);

app.get(
  "/context/json",
  async (c: Context): Promise<Response> => {
    return c.json({ "testing": "json" });
  },
);

app.post(
  "/context/parseJSON/invalidJSON",
  async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.JSON);
    return c.json(`<h1>${data}</h1>`);
  },
);

app.post(
  "/context/parseJSON/validJSON",
  async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.JSON);
    return c.json(`<h1>${data}</h1>`);
  },
);

app.get(
  "/context/query",
  async (c: Context): Promise<Response> => {
    return c.json({ queryValue: c.query("key", "default") });
  },
);

app.get(
  "/context/set-cookie",
  async (c: Context): Promise<Response> => {
    c.setCookie("testCookie", "cookieValue", { path: "/", maxAge: 3600 });
    return c.json({ message: "Cookie set!" });
  },
);

app.get(
  "/context/get-cookie",
  async (c: Context): Promise<Response> => {
    return c.json({ cookieValue: c.getCookie("testCookie") });
  },
);

app.get(
  "/context/clear-cookie",
  async (c: Context): Promise<Response> => {
    c.clearCookie("testCookie");
    return c.json({ message: "Cookie cleared!" });
  },
);

app.post(
  "/context/parseText",
  async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.TEXT);
    return c.json({ receivedText: data });
  },
);

app.post(
  "/context/parseForm",
  async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.FORM);
    return c.json({ receivedFormData: data });
  },
);

app.post(
  "/context/parseMultipartForm",
  async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.MULTIPART_FORM);
    const formDataObject: Record<string, any> = {};
    data!.forEach((value: any, key: any) => {
      formDataObject[key] = value;
    });
    return c.json({ receivedMultipartFormData: formDataObject });
  },
);

app.get(
  "/context/headers",
  async (c: Context): Promise<Response> => {
    return c.json({ userAgent: c.req.headers.get("User-Agent") });
  },
);

app.get(
  "/context/stream-file",
  async (c: Context): Promise<Response> => {
    let file = Bun.file("./static/test.txt");
    if (!file.exists) {
      return c.status(404).text("File not found");
    }
    return await c.file(file, true);
  },
);

app.get(
  "/static/*",
  async (c: Context): Promise<Response> => {
    let file = Bun.file("." + c.path);
    if (!file.exists) {
      return c.status(404).text("file not found");
    }
    return await c.file(file);
  },
);

app.put(
  "/context/method/put",
  async (c: Context): Promise<Response> => {
    return c.json({ message: "PUT method received" });
  },
);

app.delete(
  "/context/method/delete",
  async (c: Context): Promise<Response> => {
    return c.json({ message: "DELETE method received" });
  },
);

app.patch(
  "/context/method/patch",
  async (c: Context): Promise<Response> => {
    return c.json({ message: "PATCH method received" });
  },
);

app.get(
  "/context/params/:id",
  async (c: Context): Promise<Response> => {
    return c.json({ paramValue: c.param("id") });
  },
);

app.get(
  "/context/params/:id/details/:detailId",
  async (c: Context): Promise<Response> => {
    return c.json({
      id: c.param("id"),
      detailId: c.param("detailId"),
    });
  },
);

app.get(
  "/context/query/multiple",
  async (c: Context): Promise<Response> => {
    return c.json({
      key1: c.query("key1", "default1"),
      key2: c.query("key2", "default2"),
    });
  },
);

app.get(
  "/context/status/200",
  async (c: Context): Promise<Response> => {
    return c.json({ message: "OK" });
  },
);

app.get(
  "/context/status/400",
  async (c: Context): Promise<Response> => {
    return c.status(400).json({ error: "Bad Request" });
  },
);

app.get(
  "/context/status/500",
  async (c: Context): Promise<Response> => {
    return c.status(500).json({ error: "Internal Server Error" });
  },
);

app.get(
  "/context/headers/custom",
  async (c: Context): Promise<Response> => {
    c.setHeader("X-Custom-Header", "CustomValue");
    return c.json({ message: "Custom header set" });
  },
);

app.get(
  "/context/set-secure-cookie",
  async (c: Context): Promise<Response> => {
    c.setCookie("secureTest", "secureValue", { secure: true, httpOnly: true });
    return c.json({ message: "Secure cookie set!" });
  },
);

app.get(
  "/context/set-expiring-cookie",
  async (c: Context): Promise<Response> => {
    c.setCookie("expiringTest", "willExpire", {
      maxAge: 10,
    });
    return c.json({ message: "Expiring cookie set!" });
  },
);

app.post(
  "/context/parseBody/empty",
  async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.JSON);
    return c.json({ receivedBody: data });
  },
);

app.post(
  "/context/parseBody/largeJSON",
  async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.JSON);
    return c.json({ receivedBody: data });
  },
);

app.get(
  "/context/serve-image",
  async (c: Context): Promise<Response> => {
    let file = Bun.file("./static/image.png");
    if (!file.exists) {
      return c.status(404).text("File not found");
    }
    return await c.file(file);
  },
);

app.get(
  "/context/serve-text-file",
  async (c: Context): Promise<Response> => {
    let file = Bun.file("./static/sample.txt");
    if (!file.exists) {
      return c.status(404).text("File not found");
    }
    return await c.file(file);
  },
);

app.get(
  "/middleware/early-response",
  async (c: Context): Promise<Response> => {
    return c.json({ message: "This should not execute" });
  },
  mwEarlyResponse,
);

app.get(
  "/middleware/order-test",
  async (c: Context): Promise<Response> => {
    return c.json({ message: "Middleware order test" });
  },
  mwOrderTest1,
  mwOrderTest2,
);

app.get(
  "/wildcard/*",
  async (c: Context): Promise<Response> => {
    return c.json({ message: `Matched wildcard route for ${c.path}` });
  },
);

app.get(
  "/wildcard/deep/*",
  async (c: Context): Promise<Response> => {
    return c.json({ message: `Matched deep wildcard route for ${c.path}` });
  },
);

app.get(
  "/set-cookies",
  async (c) => {
    c.setCookie("user", "john_doe", { path: "/", httpOnly: true });
    c.setCookie("session", "xyz123", { path: "/", secure: true });

    return c.json({ message: "Cookies set" });
  },
);

app.get(
  "/get-cookies",
  async (c) => {
    return c.json({
      user: c.getCookie("user"),
      session: c.getCookie("session"),
    });
  },
);

const mwModifyContext = new Middleware(async (c, next) => {
  c.setStore("modified", "This was set by middleware!");
  await next();
});

app.get("/middleware/modify-context", async (c: Context): Promise<Response> => {
  return c.json({ message: c.getStore("modified") });
}, mwModifyContext);

app.onNotFound(async (c: Context): Promise<Response> => {
  return c.status(404).text("404 Not Found");
});

app.onErr(async (c: Context): Promise<Response> => {
  return c.status(500).text("internal server error");
});

const server = Bun.serve({
  port: 8080,
  fetch: async (req: Request) => {
    return await app.run(req);
  },
});

console.log(`Server running on ${server.port}`);
