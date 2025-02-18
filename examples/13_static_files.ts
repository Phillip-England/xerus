import { HTTPContext, Xerus } from "../xerus";

let app = new Xerus()

app.get("/static/*", async (c: HTTPContext) => {
  return await c.file("." + c.path);
});

await app.listen()