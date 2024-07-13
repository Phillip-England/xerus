import { Xerus, XerusCtx, XerusMw } from "../src/export"


export const init = async (app: Xerus) => {
    app.use(XerusMw.serveStaticFiles)
}