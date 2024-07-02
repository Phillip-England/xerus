import React from "react"
import { HandlerExport } from "../../../../src/HandlerExport"
import { Handler, LoadFunc } from "../../../../src/Handler"
import { XerusCtx } from "../../../../src/XerusCtx"
import { IconToggle, Layout } from '../../../../lib/components/components'

export const handler = new HandlerExport()

handler.load = async (): Promise<any> => {
    return "loading!";
}


handler.get = new Handler(async (ctx: XerusCtx) => {
    let data = await ctx.load()
    console.log(data)
    ctx.jsx(200, <Layout><IconToggle/></Layout>)
})
