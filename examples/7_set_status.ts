import { HTTPContext, Xerus } from "..";

let app = new Xerus();

app.get("/", async (c: HTTPContext) => {
  return c.setStatus(404).html(`<h1>O'Doyle Not Found</h1>`);
});

await app.listen();
