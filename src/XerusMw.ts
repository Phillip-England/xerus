import type { BunFile } from "bun";
import type { XerusCtx } from "./XerusCtx";



export class XerusMw {

    static async serveStaticFiles(ctx: XerusCtx) {
        let request = ctx.xerusReq?.req;
        if (!request) {
            return;
        }
        let path: string = new URL(request.url).pathname;
        if (path.startsWith('/static')) {
            let filePath: string = path.replace('/static', 'static');
            let file: BunFile = await Bun.file(filePath);
            if (await file.exists()) {
                ctx.setHeader('Content-Type', file.type);
                ctx.setBody(file)
            }
        }
    }

    static async serveFavicon(ctx: XerusCtx) {
        let request = ctx.xerusReq?.req;
        if (!request) {
            return;
        }
        let path: string = new URL(request.url).pathname;
        if (path.startsWith('/favicon.ico')) {
            let filePath: string = path.replace('/favicon.ico', 'favicon.ico');
            let file: BunFile = await Bun.file(filePath);
            if (await file.exists()) {
                ctx.setHeader('Content-Type', file.type);
                ctx.setBody(file)
            }
        }
    }

}