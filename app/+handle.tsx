import React from "react";
import { XerusCtx } from "../src/XerusCtx";



export class Handle {

    static get = async (ctx: XerusCtx) => {
        ctx.jsx(200, <div>GET</div>)
    }

}