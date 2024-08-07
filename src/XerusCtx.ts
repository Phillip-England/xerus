
import { renderToString } from "react-dom/server"
import { XerusRequest } from "./XerusRequest";
import { XerusResponse } from "./XerusResponse";
import type { Cookie } from "./Cookie";
import { ERR_BODY_OVERWRITE } from "./XerusErr";
import type { LoadFunc } from "./export";


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

    query(key: string): string {
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

    html(status: number, body: any, ignoreBodyCheck: boolean = false) {
        if (this.bodyIsSet() && !ignoreBodyCheck) {
            this.text(500, ERR_BODY_OVERWRITE, true);
            return
        }
        this.xerusRes.setHeader("Content-Type", "text/html");
        this.xerusRes.setStatus(status);
        this.xerusRes.setBody(body.trim());
    }

    json(status: number, body: any, ignoreBodyCheck: boolean = false) {
        if (this.bodyIsSet() && !ignoreBodyCheck) {
            this.text(500, ERR_BODY_OVERWRITE, true);
            return
        }
        this.xerusRes.setHeader("Content-Type", "application/json");
        this.xerusRes.setStatus(status);
        this.xerusRes.setBody(JSON.stringify(body));
    }

    jsx(status: number, body: any, ignoreBodyCheck: boolean = false) {
        if (this.bodyIsSet() && !ignoreBodyCheck) {
            this.text(500, ERR_BODY_OVERWRITE, true);
            return
        }
        this.xerusRes.setHeader("Content-Type", "text/html");
        this.xerusRes.setStatus(status);
        this.xerusRes.setBody(renderToString(body));
    }

    text(status: number, body: any, ignoreBodyCheck: boolean = false) {
        if (this.bodyIsSet() && !ignoreBodyCheck) {
            this.text(500, ERR_BODY_OVERWRITE, true);
            return
        }
        this.xerusRes.setHeader("Content-Type", "text/plain");
        this.xerusRes.setStatus(status);
        this.xerusRes.setBody(body);
    }

    clearBody() {
        this.xerusRes.body = ""
    }

    bodyIsSet(): boolean {
        return this.xerusRes.body !== "";
    }

    store(key: string, value: any) {
        this.data[key] = value;
    }

    get(key: string): any {
        return this.data[key];
    }

    setLoadFunc(loadFunc: LoadFunc) {
        if (!this.xerusReq) {
            return;
        }
        this.xerusReq.loadFunc = loadFunc;
    }

    setClientFunc(clientFunc: LoadFunc) {
        if (!this.xerusReq) {
            return;
        }
        this.xerusReq.clientFunc = clientFunc;
    }

    async load(): Promise<any> {
        if (!this.xerusReq) {
            return async () => null;
        }
        return this.xerusReq.loadFunc();
    }


}
