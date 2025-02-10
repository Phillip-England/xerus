import {
  type Context,
  cors,
  customCors,
  errorHandler,
  logger,
  staticHandler,
  Xerus,
  makeMiddleware
} from "./xerus";

const app = new Xerus();

app.use(logger, errorHandler);

app.setErrorHandler(async (c, err) => {
  console.error("Custom Error:", err);
  return c.json({
    error: "Something went wrong",
    details: (err as Error).message,
  }, 500);
});

async function errorThrowingMiddleware(
  c: Context,
  next: () => Promise<Response>,
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
  c.headers.set("X-Custom-Header", "Hello");
  return c.html("<h1>Cookie Set!</h1>");
});

app.get("/delete-cookie", async (c: Context) => {
  c.deleteCookie("user");
  return c.html("<h1>Cookie Deleted!</h1>");
});


export const testStore = makeMiddleware(async (c, next) => {
  c.store.test = "testing";
  return await next();
});

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

const corsMiddleware = customCors({
  origin: "http://example.com",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Custom-Header"],
  credentials: true,
  maxAge: 600,
});

app.get("/cors-test", async (c) => {
  return c.json({ message: "CORS is working!" });
}, corsMiddleware);

app.options("/cors-test", async (c) => {
  return new Response(null, { status: 204, headers: c.headers });
}, corsMiddleware);

const openCors = customCors({ origin: "*", methods: ["GET", "POST"] });

app.get("/public-data", async (c) => {
  return c.json({ data: "This is accessible from any origin" });
}, openCors);

app.get("/private-data", async (c) => {
  c.setCookie("session", "valid_session_token", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });
  return c.json({ secret: "This data requires credentials" });
}, corsMiddleware);

app.get("/wild/*", async (c) => {
  return c.json({ path: c.params["*"], message: "Wildcard CORS test" });
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

app.get('/blank-cors', async (c: Context) => {
  return c.json({ "success": "true" }, 200);
}, cors)

app.get("/search", async (c: Context) => {
  const term = c.query("q");
  const allParams = c.query(); 
  return c.json({ term, allParams });
});

let server = Bun.serve({
  port: 8080,
  idleTimeout: 10,
  development: false,
  async fetch(req) {
    return await app.handleRequest(req);
  },
});

console.log(`starting server on port ${server.port}! 🚀`);
