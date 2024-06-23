import type { AppContext, Cookie } from "./types/types";

export const setBody = (ctx: AppContext, body: string) => {
    ctx.response.body = body;
    ctx.response.ready = true;
};

export const setHeader = (ctx: AppContext, key: string, value: string) => {
    ctx.response.headers[key] = value;
};

export const setStatus = (ctx: AppContext, status: number) => {
    ctx.response.status = status;
    ctx.response.ready = true;
};

export const pathPart = (ctx: AppContext, index: number): string => {
    index++;
    let request = ctx.request;
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

export const pathParam = (ctx: AppContext, key: string): string => {
    let request = ctx.request;
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

export const getCookie = (ctx: AppContext, key: string): Cookie | null => {
    let request = ctx.request;
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
};

export const setCookie = (ctx: AppContext, cookie: Cookie) => {
    let response = ctx.response;
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

    response.headers['Set-Cookie'] = cookieString;
};
