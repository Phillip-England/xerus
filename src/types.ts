

export type AppContext = {
    request: Request | null,
    response: MockResponse
}

export type MiddlewareFunc = (ctx: AppContext) => Promise<void>

export type HandlerFunc = (ctx: AppContext) => Promise<void>

export type MockResponse = {
    status: number,
    body: string,
    headers: {[key: string]: string},
    ready: boolean
}

export type Cookie = {
    key: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: string;
    maxAge?: number;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
};