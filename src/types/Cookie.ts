

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