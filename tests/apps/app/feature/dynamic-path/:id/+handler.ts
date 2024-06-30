import { HandlerFile, XerusCtx } from "../../../../../src/export";


const handler = new HandlerFile();

handler.get = async (ctx: XerusCtx) => {
    ctx.text(200, ctx.pathPart(2))
}


export default handler;