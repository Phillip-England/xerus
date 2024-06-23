import { XerusMw } from "./xerus/middleware/middleware"
import { Xerus, comp, setBody, setHeader, type RequestCtx } from "./xerus/package"

const app = new Xerus()

app.use(XerusMw.serveStaticFiles)

app.use(async (ctx: RequestCtx) => {
	setHeader(ctx, "Content-Type", "text/html")
})

const SomeComponent = (props: {
    text: string
}) => {
    return (
        <>
            <h1>{props.text}</h1>
        </>
    )
}

app.get("/", async (ctx: RequestCtx) => {
	setBody(ctx, comp(<SomeComponent text="/" />))
})

app.get("/about", async (ctx: RequestCtx) => {
	setBody(ctx, comp(<SomeComponent text='/about' />))
})

app.run(8080)