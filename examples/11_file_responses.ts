import { HTTPContext, Xerus } from "../xerus";

let app = new Xerus()

app.get('/', async (c: HTTPContext) => {
  let file = Bun.file("./path/to/file");
  return c.file(file);
});

await app.listen()