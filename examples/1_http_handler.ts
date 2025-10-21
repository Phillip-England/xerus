 import { HTTPContext, Xerus } from "..";

let app = new Xerus()

let handler = async (c: HTTPContext) => {
  return c.html(`<h1>O'Doyle Rules</h1>`)
}

app.get('/', handler)

await app.listen()