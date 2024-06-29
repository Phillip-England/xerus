import { HandlerFile, XerusCtx } from "../../../../src/export";


const handler = new HandlerFile();

handler.get = async (ctx: XerusCtx) => {
    ctx.text(200, ctx.query('some_value'))
}


export default handler;