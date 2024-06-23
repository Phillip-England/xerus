import type { BunFile } from "bun";
import type { RequestCtx } from "./RequestCtx";
import { setBody, setHeader } from "./http/http";



export class XerusMw {

    static async serveStaticFiles(ctx: RequestCtx) {
        let request = ctx.request;
        if (!request) {
            return;
        }
        let path: string = new URL(request.url).pathname;
        if (path.startsWith('/static')) {
            let filePath: string = path.replace('/static', 'static');
            let file: BunFile = await Bun.file(filePath);
            if (await file.exists()) {
                setHeader(ctx, 'Content-Type', file.type);
                setBody(ctx, file)
            }
        }
    }

    static async serveFavicon(ctx: RequestCtx) {
        let request = ctx.request;
        if (!request) {
            return;
        }
        let path: string = new URL(request.url).pathname;
        if (path.startsWith('/favicon.ico')) {
            let filePath: string = path.replace('/favicon.ico', 'favicon.ico');
            let file: BunFile = await Bun.file(filePath);
            if (await file.exists()) {
                setHeader(ctx, 'Content-Type', file.type);
                setBody(ctx, file)
            }
        }
    }

}