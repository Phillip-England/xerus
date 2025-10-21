import { BodyType, HTTPContext, Xerus } from "../server";

let app = new Xerus()

app.get('/user/:id', async (c: HTTPContext) => {
  let id = c.getParam('id')
  return c.html(`<h1>O'Doyle Rules Times ${id}!</h1>`)
})

await app.listen()