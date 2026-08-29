import { HTTPContext, Xerus } from "..";

let app = new Xerus();

let handler = async (c: HTTPContext) => {
  return c.html(`<h1>O'Doyle Rules</h1>`);
};

app.get("/", handler);
app.get("/user/:id", handler);
app.get("/static/*", handler);

app.group("/api")
  .post("/user/:id", handler)
  .post("/user/post/:postNumber", handler);

await app.listen();
