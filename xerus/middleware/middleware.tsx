import type { BunFile } from "bun";
import { setBody, setHeader, type RequestCtx } from "../package";



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

}