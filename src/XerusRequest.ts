import type { Cookie, LoadFunc } from "./export";


export class XerusRequest {

    req: Request | null = null;
    loadFunc: LoadFunc
    clientFunc: LoadFunc

    constructor(request: Request) {
        this.req = request;
        this.loadFunc = async () => null;
        this.clientFunc = async () => null;
    }

    pathPart = (index: number): string => {
        index++;
        let request = this.req;
        if (!request) {
            return "";
        }
        let path = new URL(request.url).pathname;
        let parts = path.split('/');
        if (index >= parts.length) {
            return "";
        }
        return parts[index];
    };
    
    getParam = (key: string): string => {
        let request = this.req;
        if (!request) {
            return "";
        }
        let url = new URL(request.url);
        let searchParams = url.searchParams;
        let param = searchParams.get(key);
        if (!param) {
            return "";
        }
        return param;
    };

    getCookie(key: string): Cookie | null {
        let request = this.req;
        if (!request) {
            return null;
        }
        let cookieHeader = request.headers.get('Cookie');
        if (!cookieHeader) {
            return null;
        }
        let cookies = cookieHeader.split(';').map(cookie => cookie.trim());
        for (let cookie of cookies) {
            let [k, v] = cookie.split('=');
            if (k === key) {
                return { key: k, value: v };
            }
        }
        return null;
    }

    getHeader(key: string): string | null {
        let request = this.req;
        if (!request) {
            return null;
        }
        return request.headers.get(key);
    }


}