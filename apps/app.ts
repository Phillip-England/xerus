import {
  BodyType,
  Context,
  Handler,
  logger,
  Middleware,
  Router,
} from "../primitives";

// define router
const r = new Router();

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

r.get(
  "/",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({ message: "Hello, world!" });
  }),
	logger
);

r.get(
  "/context/html",
  new Handler(async (c: Context): Promise<Response> => {
    return c.html("<h1>Hello, World!</h1>");
  }),
	logger
);

r.get(
  "/context/json",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({ "testing": "json" });
  }),
	logger
);

r.post(
  "/context/parseJSON/invalidJSON",
  new Handler(async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.JSON);
    return c.json(`<h1>${data}</h1>`);
  }),
	logger
);

r.post(
  "/context/parseJSON/validJSON",
  new Handler(async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.JSON);
    return c.json(`<h1>${data}</h1>`);
  }),
	logger
);

r.get(
  "/context/query",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({ queryValue: c.query("key", "default") });
  }),
	logger
);

r.get(
  "/context/set-cookie",
  new Handler(async (c: Context): Promise<Response> => {
    c.setCookie("testCookie", "cookieValue", { path: "/", maxAge: 3600 });
    return c.json({ message: "Cookie set!" });
  }),
	logger
);

r.get(
  "/context/get-cookie",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({ cookieValue: c.getCookie("testCookie") });
  }),
	logger
);

r.get(
  "/context/clear-cookie",
  new Handler(async (c: Context): Promise<Response> => {
    c.clearCookie("testCookie");
    return c.json({ message: "Cookie cleared!" });
  }),
	logger
);

r.post(
  "/context/parseText",
  new Handler(async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.TEXT);
    return c.json({ receivedText: data });
  }),
	logger
);

r.post(
  "/context/parseForm",
  new Handler(async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.FORM);
    return c.json({ receivedFormData: data });
  }),
	logger
);

r.post(
  "/context/parseMultipartForm",
  new Handler(async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.MULTIPART_FORM);
    const formDataObject: Record<string, any> = {};
    data!.forEach((value: any, key: any) => {
      formDataObject[key] = value;
    });
    return c.json({ receivedMultipartFormData: formDataObject });
  }),
	logger
);

r.get(
  "/context/headers",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({ userAgent: c.req.headers.get("User-Agent") });
  }),
	logger
);

r.get(
  "/context/stream-file",
  new Handler(async (c: Context): Promise<Response> => {
    let file = await c.file("./static/test.txt", true);
    if (!file) {
      return c.status(404).send("File not found");
    }
    return file;
  }),
	logger
);

r.get(
  "/static/*",
  new Handler(async (c: Context): Promise<Response> => {
    let file = await c.file("." + c.path);
    if (!file) {
      return c.status(404).send("file not found");
    }
    return file;
  }),
);

r.put(
  "/context/method/put",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({ message: "PUT method received" });
  }),
	logger
);

r.delete(
  "/context/method/delete",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({ message: "DELETE method received" });
  }),
	logger
);

r.patch(
  "/context/method/patch",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({ message: "PATCH method received" });
  }),
	logger
);

r.get(
  "/context/params/:id",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({ paramValue: c.param("id") });
  }),
	logger
);

r.get(
  "/context/params/:id/details/:detailId",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({
      id: c.param("id"),
      detailId: c.param("detailId"),
    });
  }),
	logger
);

r.get(
  "/context/query/multiple",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({
      key1: c.query("key1", "default1"),
      key2: c.query("key2", "default2"),
    });
  }),
	logger
);

r.get(
  "/context/status/200",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({ message: "OK" });
  }),
	logger
);

r.get(
  "/context/status/400",
  new Handler(async (c: Context): Promise<Response> => {
    return c.status(400).json({ error: "Bad Request" });
  }),
	logger
);

r.get(
  "/context/status/500",
  new Handler(async (c: Context): Promise<Response> => {
    return c.status(500).json({ error: "Internal Server Error" });
  }),
	logger
);

r.get(
  "/context/headers/custom",
  new Handler(async (c: Context): Promise<Response> => {
    c.setHeader("X-Custom-Header", "CustomValue");
    return c.json({ message: "Custom header set" });
  }),
	logger
);

r.get(
  "/context/set-secure-cookie",
  new Handler(async (c: Context): Promise<Response> => {
    c.setCookie("secureTest", "secureValue", { secure: true, httpOnly: true });
    return c.json({ message: "Secure cookie set!" });
  }),
	logger
);

r.get(
  "/context/set-expiring-cookie",
  new Handler(async (c: Context): Promise<Response> => {
    c.setCookie("expiringTest", "willExpire", {
      maxAge: 10,
    });
    return c.json({ message: "Expiring cookie set!" });
  }),
	logger
);

r.post(
  "/context/parseBody/empty",
  new Handler(async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.JSON);
    return c.json({ receivedBody: data });
  }),
	logger
);

r.post(
  "/context/parseBody/largeJSON",
  new Handler(async (c: Context): Promise<Response> => {
    let data = await c.parseBody(BodyType.JSON);
    return c.json({ receivedBody: data });
  }),
	logger
);

r.get(
  "/context/serve-image",
  new Handler(async (c: Context): Promise<Response> => {
    let file = await c.file("./static/image.png");
    if (!file) {
      return c.status(404).send("File not found");
    }
    return file;
  }),
	logger
);

r.get(
  "/context/serve-text-file",
  new Handler(async (c: Context): Promise<Response> => {
    let file = await c.file("./static/sample.txt");
    if (!file) {
      return c.status(404).send("File not found");
    }
    return file;
  }),
	logger
);

r.get(
  "/middleware/early-response",
  new Handler(
    async (c: Context): Promise<Response> => {
      return c.json({ message: "This should not execute" });
    },
  ),
	mwEarlyResponse,
    logger,
);

r.get(
  "/middleware/order-test",
  new Handler(
    async (c: Context): Promise<Response> => {
      return c.json({ message: "Middleware order test" });
    }
  ),
	logger,
	mwOrderTest1,
	mwOrderTest2,
);

r.get(
  "/wildcard/*",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({ message: `Matched wildcard route for ${c.path}` });
  }),
	logger
);

r.get(
  "/wildcard/deep/*",
  new Handler(async (c: Context): Promise<Response> => {
    return c.json({ message: `Matched deep wildcard route for ${c.path}` });
  }),
	logger
);

r.get(
  "/set-cookies",
  new Handler(async (c) => {
    c.setCookie("user", "john_doe", { path: "/", httpOnly: true });
    c.setCookie("session", "xyz123", { path: "/", secure: true });

    return c.json({ message: "Cookies set" });
  }),
	logger
);

r.get(
  "/get-cookies",
  new Handler(async (c) => {
    return c.json({
      user: c.getCookie("user"),
      session: c.getCookie("session"),
    });
  }),
	logger
);

const mwModifyContext = new Middleware(async (c, next) => {
  c.setStore("modified", "This was set by middleware!");
  await next();
});

r.get(
  "/middleware/modify-context",
  new Handler(
    async (c: Context): Promise<Response> => {
      return c.json({ message: c.getStore("modified") });
    }
  ),
	logger,
	mwModifyContext,
);

const server = Bun.serve({
  port: 8080,
  fetch: async (req: Request) => {
    try {
      const { handler, c } = r.find(req);
      if (handler) {
        return await handler.execute(c);
      }
      return new Response("404 Not Found", { status: 404 });
    } catch (e: any) {
      console.error(e);
      return new Response("internal server error", {
        status: 500,
        headers: { "Content-Type": "text/plain" }, // Ensure text response
      });
    }
  },
});


console.log(`Server running on ${server.port}`);
