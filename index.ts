import { type Context, cors, errorHandler, logger, staticHandler, Xerus } from "./xerus";

const app = new Xerus();

app.use(logger);
app.use(errorHandler());

app.setErrorHandler(async (ctx, err) => {
  console.error("Custom Error:", err);
  return ctx.json({
    error: "Something went wrong",
    details: (err as Error).message,
  }, 500);
});

async function errorThrowingMiddleware(
  c: Context,
  next: () => Promise<Response>
): Promise<Response> {
  throw new Error("Middleware triggered error");
}

app.get("/", async (c: Context) => {
  return c.html("<h1>GET /</h1>");
});

app.post("/", async (c: Context) => {
  return c.json({ "user": "phillip" }, 200);
});

app.get("/static/*", staticHandler("./static"), logger);

app.get("/user/settings", async (c: Context) => {
  return c.html("<h1>User Settings</h1>");
});

app.get("/user/:id", async (c: Context) => {
  return c.json({ "user": "phillip", "id": c.params.id });
});

app.get("/set-cookie", async (c: Context) => {
  c.setCookie("user", "philthy", { httpOnly: true, maxAge: 3600 });
  c.headers["X-Custom-Header"] = "Hello";
  return c.html("<h1>Cookie Set!</h1>");
});

app.get("/delete-cookie", async (c: Context) => {
  c.deleteCookie("user");
  return c.html("<h1>Cookie Deleted!</h1>");
});

export async function testStore(
  c: Context,
  next: () => Promise<Response>,
): Promise<Response> {
  c.store.test = "testing";
  const response = await next();
  return response;
}

app.get("/testing-store", async (c: Context) => {
  return c.html(`<h1>${c.store.test}</h1>`);
}, testStore);

app.post("/login", async (c: Context) => {
  c.setCookie("session", "valid-session", {
    httpOnly: true,
    secure: true,
    maxAge: 86400,
  });
  return c.json({ message: "Logged in successfully" });
});

app.get("/logout", async (c: Context) => {
  c.deleteCookie("session");
  return c.html("<h1>Logged out</h1>");
});

app.post("/upload", async (c: Context) => {
  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file uploaded" }, 400);
  }

  return c.json({ message: `Received file: ${file.name}`, size: file.size });
});

app.get("/redirect", async (c: Context) => {
  return c.redirect("/");
});

app.get("/status/:code", async (c: Context) => {
  const statusCode = parseInt(c.params.code, 10);
  if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
    return c.json({ error: "Invalid status code" }, 400);
  }
  return new Response(`Status ${statusCode}`, { status: statusCode });
});

const corsMiddleware = cors({
  origin: "http://example.com",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Custom-Header"],
  credentials: true,
  maxAge: 600,
});

app.get("/cors-test", async (ctx) => {
  return ctx.json({ message: "CORS is working!" });
}, corsMiddleware);

app.options("/cors-test", async (ctx) => {
  return new Response(null, { status: 204, headers: ctx.headers });
}, corsMiddleware);

const openCors = cors({ origin: "*", methods: ["GET", "POST"] });

app.get("/public-data", async (ctx) => {
  return ctx.json({ data: "This is accessible from any origin" });
}, openCors);

app.get("/private-data", async (ctx) => {
  ctx.setCookie("session", "valid_session_token", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });
  return ctx.json({ secret: "This data requires credentials" });
}, corsMiddleware);

app.get("/wild/*", async (ctx) => {
  return ctx.json({ path: ctx.params["*"], message: "Wildcard CORS test" });
}, corsMiddleware);

app.post("/test-body", async (c: Context) => {
  const body = await c.parseBody<{ message: string }>();
  if (!body || !body.message) {
    return c.json({ error: "Invalid request body" }, 400);
  }
  return c.json({ received: body.message }, 200);
});

app.get("/throw-err", async (c: Context) => {
  throw new Error("bad route");
});

app.get("/throw-middleware-error", async (c: Context) => {
  return c.json({ "success": "true" }, 200);
}, errorThrowingMiddleware);

let server = Bun.serve({
  port: 8080,
  idleTimeout: 10,
  development: false,
  async fetch(req) {
    let response = await app.handleRequest(req);
    if (response) {
      return response;
    }
    return new Response("404 Not Found", { status: 404 });
  },
});

console.log(`starting server on port ${server.port}`);
