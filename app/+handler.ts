import React from "react";
import { XerusCtx } from "../src/export";
import { HandlerFile } from "../src/FileBasedRouter";


const handler = new HandlerFile();

handler.get = async (ctx: XerusCtx) => {
    ctx.html(200, /*html*/`
        <html lang="en">
        <head>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <script src='/static/index.js'></script>
            <title>Document</title>
        </head>
        <body>
            <h1 id='title'>hello world</h1>
            <button id='button'>click me</button>
            <script>
                    const title = document.getElementById('title')
                    const button = document.getElementById('button')
                    const countSignal = store.getSignal('count', 0)
                    countSignal.subscribe((count) => {
                        title.innerText = count
                    })
                    button.addEventListener('click', () => {
                        countSignal.set(countSignal.get() + 1)
                    })
            </script>
        </body>
        </html>
    </>`)
}

handler.post = async (ctx: XerusCtx) => {
    ctx.json(200, {message: "hello world"})
}


export default handler;