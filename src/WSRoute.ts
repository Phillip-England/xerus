import { WSHandler } from "./WSHandler";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import type { 
    WSOpenFunc, 
    WSMessageFunc, 
    WSCloseFunc, 
    WSDrainFunc 
} from "./WSHandlerFuncs";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { ValidationCallback } from "./Route";

export class WSRoute {
    public path: string;
    
    // Handlers
    private _open?: WSOpenFunc;
    private _message?: WSMessageFunc;
    private _close?: WSCloseFunc;
    private _drain?: WSDrainFunc;

    // Middlewares per event
    private openMiddlewares: Middleware<HTTPContext>[] = [];
    private messageMiddlewares: Middleware<HTTPContext>[] = [];
    private closeMiddlewares: Middleware<HTTPContext>[] = [];
    private drainMiddlewares: Middleware<HTTPContext>[] = [];

    constructor(path: string) {
        this.path = path;
    }

    // --- Definition Methods ---

    open(handler: WSOpenFunc, ...mw: Middleware<HTTPContext>[]) {
        this._open = handler;
        this.openMiddlewares.push(...mw);
        return this;
    }

    message(handler: WSMessageFunc, ...mw: Middleware<HTTPContext>[]) {
        this._message = handler;
        this.messageMiddlewares.push(...mw);
        return this;
    }

    close(handler: WSCloseFunc, ...mw: Middleware<HTTPContext>[]) {
        this._close = handler;
        this.closeMiddlewares.push(...mw);
        return this;
    }

    drain(handler: WSDrainFunc, ...mw: Middleware<HTTPContext>[]) {
        this._drain = handler;
        this.drainMiddlewares.push(...mw);
        return this;
    }

    // --- Validation (Specific to Message Event) ---

    validateMessage<T = any>(callback: ValidationCallback<T>) {
        const validatorMw = new Middleware(async (c: HTTPContext, next) => {
            const raw = c._wsMessage;
            
            // Auto-convert buffer for convenience if validating JSON/String
            let dataToValidate = raw;
            if (Buffer.isBuffer(raw)) {
                dataToValidate = raw.toString();
            }
            if (typeof dataToValidate === "string") {
                try { dataToValidate = JSON.parse(dataToValidate); } catch {}
            }

            try {
                const valid = await callback(dataToValidate);
                // Store in valid store under "ws_message" or just replace _wsMessage?
                // Replacing _wsMessage might break binary handlers.
                // Let's use the valid store.
                c.setValid("ws_message", valid ?? dataToValidate);
            } catch (e: any) {
                 // For WS, throwing here triggers the error handler or closes the socket
                 throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, e.message || "WS Message Validation Failed");
            }
            await next();
        });

        this.messageMiddlewares.unshift(validatorMw); // Add to beginning of message chain
        return this;
    }

    // --- Compilation ---

    compile(): WSHandler {
        const handler = new WSHandler();
        
        if (this._open) handler.setOpen(this._open, this.openMiddlewares);
        if (this._message) handler.setMessage(this._message, this.messageMiddlewares);
        if (this._close) handler.setClose(this._close, this.closeMiddlewares);
        if (this._drain) handler.setDrain(this._drain, this.drainMiddlewares);
        
        return handler;
    }
}