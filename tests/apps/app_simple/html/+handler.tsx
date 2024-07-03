import React from "react"
import { HandlerExport } from "../../../../src/HandlerExport"
import { Handler, LoadFunc } from "../../../../src/Handler"
import { XerusCtx } from "../../../../src/XerusCtx"
import { IconToggle, Layout } from '../../../../lib/components/components'

export const handler = new HandlerExport()

type User = {
    name: string
    age: number
}

handler.load = async (): Promise<User> => {
    let user: User =  {
        name: 'John Doe',
        age: 42
    }
    return user
}

handler.get = new Handler(async (ctx: XerusCtx) => {
    let data: User = await ctx.load()
    console.log(data)
    ctx.jsx(200, <Layout><IconToggle/></Layout>)
})