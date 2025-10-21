import { HTTPContext, Xerus } from "..";

let app = new Xerus()

app.get('/', async (c: HTTPContext) => {
  return c.html(`<h1>O'Doyle Rules</h1>`)
})

app.get('/redirect', async(c: HTTPContext) => {
  return c.redirect('/')
})


await app.listen()