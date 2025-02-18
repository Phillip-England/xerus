import { BodyType, HTTPContext, Xerus } from "../xerus";

let app = new Xerus()

app.get('/', async (c: HTTPContext) => {
  c.setHeader('X-Who-Rules', `O'Doyle Rules`)
  let value = c.getHeader('X-Who-Rules')
  return c.html(`<h1>${value}!</h1>`)
})

await app.listen()