import { HTTPContext, Xerus } from "../xerus";

let app = new Xerus()

app.get('/html', async (c: HTTPContext) => {
  return c.html(`<h1>O'Doyle Rules!</h1>`)
})

app.get('/json', async (c: HTTPContext) => {
  return c.json({message: `O'Doyle Rules!`})
})

app.get('/text', async (c: HTTPContext) => {
  return c.text(`O'Doyle Rules!`)
})

await app.listen()