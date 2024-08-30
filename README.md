# xerus
A tiny http library for bun.

hello world
```js
let app = new Xerus()

app.at('GET /', async (c) => {
    c.res.body = `<h1>Hello, World!</h1>`
})

Bun.serve({
    port: 8080,
    async fetch(req) {
        return await app.handleRequest(req)
    },
});
```
