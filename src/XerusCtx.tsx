
import { renderToString } from "react-dom/server"
import { XerusRequest } from "./XerusRequest";
import { XerusResponse } from "./XerusResponse";
import type { Cookie } from "./Cookie";


export class XerusCtx {
    xerusReq: XerusRequest | null;
    xerusRes: XerusResponse;
    data: {[key: string]: any} = {}

    constructor(request: Request) {
        this.xerusReq = new XerusRequest(request);
        this.xerusRes = new XerusResponse();
        this.data = {}
    }

    getCookie(key: string): Cookie | null {
        if (!this.xerusReq) {
            return null;
        }
        return this.xerusReq.getCookie(key);
    }

    setCookie(cookie: Cookie) {
        this.xerusRes.setCookie(cookie);
    }

    setHeader(key: string, value: string) {
        this.xerusRes.setHeader(key, value);
    }

    setStatus(status: number) {
        this.xerusRes.setStatus(status);
    }

    setBody(body: any) {
        this.xerusRes.setBody(body);
    }

    pathPart(index: number): string {
        if (!this.xerusReq) {
            return "";
        }
        return this.xerusReq.pathPart(index);
    }

    pathParam(key: string): string {
        if (!this.xerusReq) {
            return "";
        }
        return this.xerusReq.getParam(key);
    }

    getHeader(key: string): string | null {
        if (!this.xerusReq) {
            return null;
        }
        return this.xerusReq.getHeader(key);
    }

    html(status: number, body: any) {
        this.xerusRes.setHeader("Content-Type", "text/html");
        this.xerusRes.setStatus(status);
        this.xerusRes.setBody(body);
    }

    json(status: number, body: any) {
        this.xerusRes.setHeader("Content-Type", "application/json");
        this.xerusRes.setStatus(status);
        this.xerusRes.setBody(JSON.stringify(body));
    }

    jsx(status: number, body: any) {
        this.xerusRes.setHeader("Content-Type", "text/html");
        this.xerusRes.setStatus(status);
        this.xerusRes.setBody(renderToString(body));
    }

}
