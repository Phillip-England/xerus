import React from "react";
import { XerusCtx } from "../src/export";
import { HandlerFile } from "../src/FileBasedRouter";


const handler = new HandlerFile();

handler.get = async (ctx: XerusCtx) => {
    ctx.jsx(200, <h1>hello world</h1>)
}


export default handler;