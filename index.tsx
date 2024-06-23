import { c,  setBody, setHeader } from "./src/http/http"
import type { RequestCtx } from "./src/RequestCtx"
import { Xerus } from "./src/Xerus"
import { XerusMw } from "./src/XerusMw"

const app = new Xerus()

app.use(XerusMw.serveStaticFiles)
app.use(XerusMw.serveFavicon)

app.use(async (ctx: RequestCtx) => {
	setHeader(ctx, "Content-Type", "text/html")
})

const SomeComponent = (props: {
    text: string
}) => {
    return (
        <>  
            <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Document</title>
            </head>
            <body>
                <h1>{props.text}</h1>
            </body>
            </html>
        </>
    )
}

app.get("/", async (ctx: RequestCtx) => {
	setBody(ctx, c(<SomeComponent text="/" />))
})

app.get("/about", async (ctx: RequestCtx) => {
	setBody(ctx, c(<SomeComponent text='/about' />))
})

app.run(8080)