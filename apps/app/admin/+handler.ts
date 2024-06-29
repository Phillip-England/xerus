import { HandlerFile } from "../../../../src/HandlerFile";
import { XerusCtx } from "../../../../src/XerusCtx";





const handler = new HandlerFile();

handler.get = async (ctx: XerusCtx) => {
    let secretKey = ctx.get('admin-secret-key')
    ctx.text(200, secretKey)
}

export default handler;