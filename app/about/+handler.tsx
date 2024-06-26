import React from "react";
import { HandlerFile } from "../../src/FileBasedRouter";
import { XerusCtx } from "../../src/export";


const handler = new HandlerFile();

handler.get = async (ctx: XerusCtx) => {
    ctx.jsx(200, <h1>hello world</h1>)
}


export default handler;