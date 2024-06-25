import React from "react";
import { XerusCtx } from "../../src/export";
import { HandlerFile } from "../../plugins/FileBasedRouter";


const handler = new HandlerFile();

handler.get = async (ctx: XerusCtx) => {
    ctx.jsx(200, <h1>hello admin</h1>)
}


export default handler;