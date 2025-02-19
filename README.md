# Xerus

Simple web apps for Bun.

![logo](/static/logo-dark.png)

Check out the [docs](https://xerus.dev).

## Quickstart
```ts
import { HTTPContext, logger, Xerus } from "xerus/xerus";

let app = new Xerus()

app.use(logger)

app.get("/static/*", async (c: Context) => {
  return await c.file("." + c.path);
});

app.get('/', async (c: HTTPContext) => {
  return c.html(`<h1>O'Doyle Rules!</h1>`)
})

await app.listen()
```