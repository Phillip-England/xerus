import { Context, Handler, logger, Xerus } from "../xerus";

const app = new Xerus();

// setup logging
app.use(logger);

// basic endpoint
app.get("/", async (c: Context) => {
  return c.html("<h1>Hello, World!</h1>");
});

// serve static files from ./static
app.get("/static/*", async (c: Context) => {
  let file = Bun.file("." + c.path);
  if (!file.exists) {
    return c.status(404).text("file not found");
  }
  return await c.file(file);
});

// running the application
const server = Bun.serve({
  port: 8080,
  fetch: async (req: Request) => {
    return await app.run(req);
  },
});

console.log(`Server running on ${server.port}`);