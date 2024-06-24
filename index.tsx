import { Xerus } from "./src/Xerus"
import { XerusMw } from "./src/XerusMw"
import type { XerusCtx } from "./src/XerusCtx"
import React from "react"

const app = new Xerus()

app.global(XerusMw.serveStaticFiles)
app.global(XerusMw.serveFavicon)

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
	ctx.jsx(200, <SomeComponent text="/" />)
})

app.get("/about", async (ctx: XerusCtx) => {
	ctx.jsx(200, <SomeComponent text='/about' />)
})

type User = {
    name: string
}

app.get("/api/users", async (ctx: XerusCtx) => {
    const users: User[] = [
        { name: "Alice" },
        { name: "Bob" }
    ]
    ctx.json(200, users)
})

app.run(8080)