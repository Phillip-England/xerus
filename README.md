# Xerus
Simple web apps for Bun.

## Installation
```bash
bun add github:phillip-england/xerus
```

## Docs
Read the [docs](https://xerus.dev).

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

## File Based Routing
I have another package, `squid`, which abstracts over `xerus` and extends it for file-based routing. Checkout the [README](https://github.com/phillip-england/squid) here if you are interested.

Here is the quickstart for `squid`:
```ts
import { Squid } from "squid"

let result = await Squid.new("./app", process.cwd())
if (result.isErr()) {
  console.error(result.unwrapErr())
}

let app = result.unwrap() as Squid

await app.listen()
```