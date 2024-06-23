import { renderToString } from "react-dom/server"
import { Xerus } from "./src/Xerus"
import { XerusMw } from "./src/XerusMw"
import type { XerusCtx } from "./src/XerusCtx"

const app = new Xerus()

app.use(XerusMw.serveStaticFiles)
app.use(XerusMw.serveFavicon)

app.use(async (ctx: XerusCtx) => {
	ctx.setHeader("Content-Type", "text/html")
})

const SomeComponent = (props: {
    text: string
}) => {
    return (
        <>  
            <h1>{props.text}</h1>
            <a href='/'>Home</a>
            <a href='/about'>About</a>
        </>
    )
}

app.get("/", async (ctx: XerusCtx) => {
	ctx.send(200, renderToString(<SomeComponent text="/" />))
})

app.get("/about", async (ctx: XerusCtx) => {
	ctx.send(200, renderToString(<SomeComponent text='/about' />))
})

app.run(8080)