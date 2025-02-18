import { HTTPContext, Xerus } from "../xerus";

let app = new Xerus()

app.get('/', async (c: HTTPContext) => {
  return c.html(`<h1>O'Doyle Rules!</h1>`)
})

await app.listen()