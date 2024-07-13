import React from "react"
import { Handler } from "../src/Handler"
import { XerusCtx } from "../src/XerusCtx"
import { HandlerExport } from "../src/HandlerExport"
import { Layout, IconToggle } from "../lib/components/components"

export const handler = new HandlerExport()

handler.get = new Handler(async (ctx: XerusCtx) => {
    ctx.jsx(200, <Layout><IconToggle/></Layout>)
})

handler.client = async () => {
    console.log('yo')
}