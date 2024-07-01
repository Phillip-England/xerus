import React from "react"
import { HandlerExport } from "../../../../src/HandlerExport"
import { Handler } from "../../../../src/HandlerFunc"
import { XerusCtx } from "../../../../src/XerusCtx"
import { IconToggle, Layout } from '../../../../lib/components/components'

export const handler = new HandlerExport()

handler.get = new Handler(async (ctx: XerusCtx) => {
    ctx.html(200, Layout(<IconToggle />))
})
