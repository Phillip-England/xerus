import { Xerus } from "./Xerus"
import { logger, timeout } from "./XerusMiddleware"
import ReactDOMServer from "react-dom/server"

let app = new Xerus()

app.setTimeoutDuration(5000)

app.use('*', timeout, logger)

app.setNotFound(async (c) => {
    c.html('<h1>404 Not Found</h1>')
})

let Dom = (props) => {
    return (
        <html>
            <head>
                <meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="stylesheet" href="/static/css/output.css" />
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
        <Dom title="test">
            <p>yoooooo</p>
        </Dom>
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
