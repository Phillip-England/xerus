import { HTTPContext, Xerus } from "../server";

let app = new Xerus()

app.get('/', async (c: HTTPContext) => {
  c.setHeader('X-Who-Rules', `O'Doyle Rules`)
  return c.html(`<h1>O'Doyle Rules!</h1>`)
})

await app.listen()