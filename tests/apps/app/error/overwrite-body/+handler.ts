import { HandlerFile, XerusCtx } from "../../../../src/export";


const handler = new HandlerFile();

handler.get = async (ctx: XerusCtx) => {
    ctx.html(200, /*html*/`
        <h1>hello world</h1>
    `)
    try {
        ctx.html(200, /*html*/`
            <h1>hello world</h1>
        `)
    } catch(e: any) {
        ctx.clearBody()
        ctx.text(500, e.message)
    }
}


export default handler;