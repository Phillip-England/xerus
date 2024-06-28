import { HandlerFile } from "../../src/export";
import { XerusCtx } from "../../src/XerusCtx";


const handler = new HandlerFile();

handler.get = async (ctx: XerusCtx) => {
    ctx.html(200, /*html*/`
        <h1>hello world</h1>
    `)
}

handler.post = async (ctx: XerusCtx) => {
    ctx.json(200, {message: "hello world"})
}


export default handler;