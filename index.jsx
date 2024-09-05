import { Xerus } from "./Xerus"
import { logger, timeout } from "./XerusMiddleware"

let app = new Xerus()

app.setTimeoutDuration(5000)

app.use('*', timeout, logger)

app.setNotFound(async (c) => {
    c.html('<h1>404 Not Found</h1>')
})

app.at('GET /', async (c) => {
    c.html(`
        <form method='POST' action='/' enctype='multipart/form-data'>
            <input name='name' type='text' />
            <input name='photo' type='file' />
            <input type='submit' />
        </form>    
    `)
})

app.at('POST /', async (c) => {
    let data = await c.form()
    let photo = data.get('photo')
    await Bun.write('photo.jpg', photo);
    c.redirect("/")
})

Bun.serve({
    port: 8080,
    async fetch(req) {
        return await app.handleRequest(req)
    },
});
