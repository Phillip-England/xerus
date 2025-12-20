import type { HTTPHandlerFunc, HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { Middleware } from "./Middleware";
import { HTTPHandler } from "./HTTPHandler";
import { BodyType } from "./BodyType";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { HTTPContext } from "./HTTPContext";

// Type definition for a validation callback
export type ValidationCallback<T = any> = (data: any) => T | Promise<T>;

export class Route {
  public method: string;
  public path: string;
  public handler: HTTPHandlerFunc; // Public so Xerus can access it
  public middlewares: Middleware<HTTPContext>[] = []; // Public so Xerus can access it
  public errHandler?: HTTPErrorHandlerFunc; // Public so Xerus can access it

  constructor(method: string, path: string, handler: HTTPHandlerFunc) {
    this.method = method.toUpperCase();
    this.path = path;
    this.handler = handler;
  }

  // --- Middleware Management ---

  use(...middlewares: Middleware<HTTPContext>[]) {
    this.middlewares.push(...middlewares);
    return this;
  }

  onErr(handler: HTTPErrorHandlerFunc) {
    this.errHandler = handler;
    return this;
  }

  // --- Helper to format Zod-like errors ---
  private formatValidationErr(e: any, defaultMsg: string): string {
    if (e.issues && Array.isArray(e.issues)) {
      const details = e.issues
        .map((i: any) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return `Validation Failed: ${details}`;
    }
    return e.message || defaultMsg;
  }

  // --- Validation Methods ---

  validateJSON<T = any>(callback: ValidationCallback<T>) {
    return this.use(new Middleware(async (c: HTTPContext, next) => {
      try {
        const raw = await c.parseBody(BodyType.JSON);
        const valid = await callback(raw);
        c.setValid("json", valid ?? raw);
      } catch (e: any) {
        throw new SystemErr(
          SystemErrCode.BODY_PARSING_FAILED, 
          this.formatValidationErr(e, "JSON Validation Failed")
        );
      }
      await next();
    }));
  }

  validateForm<T = any>(callback: ValidationCallback<T>) {
    return this.use(new Middleware(async (c: HTTPContext, next) => {
      try {
        const raw = await c.parseBody(BodyType.FORM);
        const valid = await callback(raw);
        c.setValid("form", valid ?? raw);
      } catch (e: any) {
        throw new SystemErr(
          SystemErrCode.BODY_PARSING_FAILED, 
          this.formatValidationErr(e, "Form Validation Failed")
        );
      }
      await next();
    }));
  }

  validateQuery<T = any>(callback: ValidationCallback<T>) {
    return this.use(new Middleware(async (c: HTTPContext, next) => {
      try {
        const raw = c.queries;
        const valid = await callback(raw);
        c.setValid("query", valid ?? raw);
      } catch (e: any) {
        throw new SystemErr(
          SystemErrCode.BODY_PARSING_FAILED, 
          this.formatValidationErr(e, "Query Validation Failed")
        );
      }
      await next();
    }));
  }

  validateParam<T = any>(callback: ValidationCallback<T>) {
    return this.use(new Middleware(async (c: HTTPContext, next) => {
      try {
        const raw = c.params;
        const valid = await callback(raw);
        c.setValid("param", valid ?? raw);
      } catch (e: any) {
        throw new SystemErr(
          SystemErrCode.BODY_PARSING_FAILED, 
          this.formatValidationErr(e, "Param Validation Failed")
        );
      }
      await next();
    }));
  }

  validateCustom<T>(key: string, extractor: (c: HTTPContext) => any, validator: ValidationCallback<T>) {
    return this.use(new Middleware(async (c: HTTPContext, next) => {
      try {
        const raw = extractor(c);
        const valid = await validator(raw);
        c.setValid(key, valid ?? raw);
      } catch (e: any) {
         throw new SystemErr(
           SystemErrCode.BODY_PARSING_FAILED, 
           this.formatValidationErr(e, "Validation Failed")
         );
      }
      await next();
    }));
  }
}