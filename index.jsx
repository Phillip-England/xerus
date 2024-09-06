import { Xerus } from "./Xerus"
import { logger, timeout } from "./XerusMiddleware"

let app = new Xerus()

app.setTimeoutDuration(5000)
app.use('*', timeout, logger)

let Layout = (props) => {
    return (
        <html>
            <head>
                <meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="stylesheet" href="/static/css/output.css" />
				<script src='/static/js/index.js'></script>
                <title>{props.title}</title>
            </head>
            <body>
                {props.children}
            </body>
        </html>
    )
}
 
app.at('GET /', async (c) => {
    c.jsx(
        <Layout title="test">
            <p>yoooooo</p>
        </Layout>
    )
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
