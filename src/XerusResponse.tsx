import type { Cookie } from "./Cookie";
import type { XerusCtx } from "./XerusCtx";

export class XerusResponse {
    status: number;
    body: string;
    headers: { [key: string]: string };
    ready: boolean;

    constructor() {
        this.status = 200;
        this.body = '';
        this.headers = {};
        this.ready = false;
    }

    setBody(body: any) {
        this.body = body;
        this.ready = true;
    }

    setHeader(key: string, value: string) {
        this.headers[key] = value;
    }

    setStatus(status: number) {
        this.status = status;
        this.ready = true;
    }

    setCookie(cookie: Cookie) {
        let cookieString = `${cookie.key}=${cookie.value}`;

        if (cookie.domain) {
            cookieString += `; Domain=${cookie.domain}`;
        }
        if (cookie.path) {
            cookieString += `; Path=${cookie.path}`;
        } else {
            cookieString += `; Path=/`;
        }
        if (cookie.expires) {
            cookieString += `; Expires=${cookie.expires}`;
        }
        if (cookie.maxAge) {
            cookieString += `; Max-Age=${cookie.maxAge}`;
        }
        if (cookie.secure) {
            cookieString += `; Secure`;
        }
        if (cookie.httpOnly) {
            cookieString += `; HttpOnly`;
        }
        if (cookie.sameSite) {
            cookieString += `; SameSite=${cookie.sameSite}`;
        }

        this.headers['Set-Cookie'] = cookieString;
    }
}