import { MiddlewareExport } from "../../../../src/MiddlewareExport"




export const middleware = new MiddlewareExport(async (ctx) => {
    ctx.store('somekey', `${ctx.get('somekey')}1`)
})