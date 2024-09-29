import type { BunFile } from "bun";
type PotentialErr = Error | void;
export declare class Result<T, E> {
    private readonly _value?;
    private readonly _error?;
    private constructor();
    static Ok<T, E = never>(value: T): Result<T, E>;
    static Err<E, T = never>(error: E): Result<T, E>;
    isOk(): boolean;
    isErr(): boolean;
    unwrap(): T;
    unwrapErr(): E;
    unwrapOr(defaultValue: T): T;
    getErr(): E | undefined;
}
export declare class XerusRoute {
    handler: XerusHandler;
    middleware: XerusMiddleware[];
    constructor(handler: XerusHandler, ...middleware: XerusMiddleware[]);
}
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
    entryPoint: string;
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
    handleRequest(req: Request): Promise<Response | Error>;
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
    method: string;
    pathIsDynamic: boolean;
    dynamicKey: string;
    constructor(req: Request, method: string, globalContext: Object, timeoutDuration: number);
    respond(): Response;
    form(): Promise<FormData>;
    setHeader(key: string, value: string): void;
    getHeader(key: string): string;
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
    stream(streamer: () => ReadableStream<Uint8Array>, contentType?: string): void;
    getCookie(cookieName: string): string | undefined;
    setCookie(cookieName: string, value: string, options?: Record<string, any>): void;
    clearCookie(name: string, options?: {
        path?: string;
        domain?: string;
    }): void;
    md(filePath?: string): Promise<string>;
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
export declare class FileBasedRoute {
    endpoint: string;
    pageFilePath: string;
    mdFilePath: string;
    pageModule: any;
    mdContent: string;
    constructor(pageFilePath: string, targetDir: string, endpoint: string);
    extractModule(): Promise<PotentialErr>;
    generateMdContentPath(markdownFileName: string): void;
    loadMarkdownContent(): Promise<PotentialErr>;
    pushMdContentIntoGlobalContext(app: Xerus): Promise<void>;
    hookRouteToApp(app: Xerus): Promise<PotentialErr>;
}
export declare class FileBasedRouter {
    app: Xerus;
    targetDir: string;
    validFilePaths: string[];
    defaultMarkdownName: string;
    constructor(app: Xerus);
    setTargetDir(targetDir: string): PotentialErr;
    mount(): Promise<PotentialErr>;
    verifyIndex(fileNames: string[]): PotentialErr;
    parseOutPages(fileNames: string[]): string[];
    makeRouteArr(filteredFileNames: string[]): FileBasedRoute[];
    hookRoutes(moduleArr: any[]): void;
}
export {};
