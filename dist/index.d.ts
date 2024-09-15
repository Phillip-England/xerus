import type { BunFile } from "bun";
export type XerusHandler = (c: XerusContext) => Promise<void>;
export type XerusMiddleware = (c: XerusContext, next: XerusHandler) => Promise<void>;
export declare class Xerus {
    routes: {
        [key: string]: XerusHandler;
    };
    prefixMiddleware: {
        [key: string]: XerusMiddleware[];
    };
    notFound: XerusHandler;
    timeoutDuration: number;
    staticDir: string;
    globalContext: {
        [key: string]: any;
    };
    constructor();
    setNotFound(fn: XerusHandler): void;
    setStaticDir(dirPath: string): void;
    handleStatic(path: string): Promise<(c: XerusContext) => Promise<void>>;
    use(pathPrefix: string, ...middleware: XerusMiddleware[]): void;
    wrapWithMiddleware(path: string, handler: XerusHandler, ...middleware: XerusMiddleware[]): (c: XerusContext) => Promise<void>;
    at(path: string, handler: XerusHandler, ...middleware: XerusMiddleware[]): void;
    get(path: string, handler: XerusHandler, ...middleware: XerusMiddleware[]): void;
    post(path: string, handler: XerusHandler, ...middleware: XerusMiddleware[]): void;
    put(path: string, handler: XerusHandler, ...middleware: XerusMiddleware[]): void;
    delete(path: string, handler: XerusHandler, ...middleware: XerusMiddleware[]): void;
    handleRequest(req: Request): Promise<Response>;
    setTimeoutDuration(milliseconds: number): void;
    global(someKey: string, someValue: any): void;
    run(port: number): Promise<void>;
}
export declare class XerusContext {
    url: URL;
    path: string;
    req: Request;
    res: XerusResponse;
    timeoutDuration: number;
    isReady: Boolean;
    globalContext: {
        [key: string]: any;
    };
    urlContext: {
        [key: string]: number;
    };
    constructor(req: Request, globalContext: Object, timeoutDuration: number);
    respond(): Response;
    form(): Promise<FormData>;
    setHeader(key: string, value: string): void;
    status(code: number): void;
    ready(): void;
    html(str: string): void;
    redirect(path: string): void;
    json(obj: Object): void;
    jsx(component: React.ReactNode): void;
    file(file: BunFile): Promise<void>;
    param(paramName: string): string;
    getGlobal(someKey: string): any;
    dyn(key: string): string;
    text(message: string): void;
}
export declare class XerusResponse {
    headers: {
        [key: string]: string;
    };
    body: string;
    status: number;
    constructor();
}
export declare function logger(c: XerusContext, next: XerusHandler): Promise<void>;
export declare function timeout(c: XerusContext, next: XerusHandler): Promise<void>;
