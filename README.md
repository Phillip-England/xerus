# xerus
A tiny http library for Bun 🐿️

Hello, World!
```jsx
let app = new Xerus()

app.at('GET /', async (c) => {
    c.jsx(
        <h1>Hello, World!</h1>
    )
})

Bun.serve({
    port: 8080,
    async fetch(req) {
        return await app.handleRequest(req)
    },
});
```


