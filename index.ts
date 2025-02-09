import { Xerus, html, makeCookie, deleteCookie, json, logger, type Context } from "./src/xerus";
import { join } from "path";
import { existsSync } from "fs";

const STATIC_DIR = "./static"
const app = new Xerus();

app.get("/", async () => {
  return html('<h1>GET /</h1>');
}, logger);

app.post("/", async (c: Context) => {
  return json({"user": "phillip"}, 200);
}, logger);

app.get("/static/*", async (c: Context) => {
  const url = new URL(c.req.url);
  const filePath = join(STATIC_DIR, url.pathname.replace("/static/", "")); // Resolve file path
  if (!existsSync(filePath)) {
    return new Response("404 Not Found", { status: 404 });
  }
  const file = Bun.file(filePath);
  return new Response(file, {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "max-age=3600", // Cache for 1 hour
      "ETag": `"${filePath}-${file.size}-${file.lastModified}"`,
    },
  });
}, logger);

app.get("/user/settings", async (c: Context) => {
  return html("<h1>User Settings</h1>");
}, logger);

app.get("/user/:id", async (c: Context) => {
  return json({"user": "phillip", "id": c.params.id});
}, logger);


app.get("/set-cookie", async (c: Context) => {
  let cookie =  makeCookie("user", "philthy", { httpOnly: true, maxAge: 3600 })
  return html("<h1>Cookie Set!</h1>", 200, cookie, { "X-Custom-Header": "Hello" });
}, logger);

app.get("/delete-cookie", async (c: Context) => {
  return html("<h1>Cookie Deleted!</h1>", 200, deleteCookie("user")
  );
}, logger);

export async function testStore(c: Context, next: () => Promise<Response>): Promise<Response> {
  c.store.test = "testing"
  const response = await next();
  return response;
}

app.get("/testing-store", async (c: Context) => {
  return html(`<h1>${c.store.test}</h1>`);
}, logger, testStore);

app.post("/login", async (c: Context) => {
  return json({ message: "Logged in successfully" }, 200, makeCookie("session", "valid-session"));
}, logger);

app.get("/logout", async (c: Context) => {
  return html("<h1>Logged out</h1>", 200, deleteCookie("session"));
}, logger);

app.post("/upload", async (c: Context) => {
  const formData = await c.req.formData();
  const file = formData.get("file");
  
  if (!file || !(file instanceof File)) {
    return json({ error: "No file uploaded" }, 400);
  }

  return json({ message: `Received file: ${file.name}`, size: file.size });
}, logger);

app.get("/redirect", async (c: Context) => {
  return new Response(null, {
    status: 302,
    headers: { "Location": "/" }
  });
}, logger);

app.get("/status/:code", async (c: Context) => {
  const statusCode = parseInt(c.params.code, 10);
  if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
    return json({ error: "Invalid status code" }, 400);
  }
  return new Response(`Status ${statusCode}`, { status: statusCode });
}, logger);



let server = Bun.serve({
  port: 8080,
  idleTimeout: 10,
  async fetch(req) {
    let response = await app.handleRequest(req);
    if (response) {
      return response;
    }
    return new Response("404 Not Found", { status: 404 });
  }
});

console.log(`starting server on port ${server.port}`)