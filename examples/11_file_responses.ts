import { HTTPContext, Xerus } from "../xerus";

let app = new Xerus()

app.get('/', async (c: HTTPContext) => {
  return c.file("./path/to/file");
});

await app.listen()