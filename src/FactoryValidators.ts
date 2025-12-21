import { HTTPContext } from "./HTTPContext";
import { WSContext } from "./WSContext";

// Updated: Now accepts 'instance' as the 3rd argument
type ValidationLogic<T, C, I> = (value: T, c: C, instance: I) => void | Promise<void>;

/**
 * Creates a Class that validates a Query parameter (defaults to string).
 */
export function validQuery(
  validator?: ValidationLogic<string, HTTPContext, { value: string }>,
  defaultValue: string = ""
) {
  return class QueryValidator {
    value: string;
    constructor(raw: any) {
      this.value = typeof raw === "string" ? raw : String(raw ?? defaultValue);
    }
    async validate(c: HTTPContext) {
      // Pass 'this' as the 3rd argument so you can mutate .value directly
      if (validator) await validator(this.value, c, this);
    }
  };
}

/**
 * Creates a Class that validates a Path Parameter (defaults to string).
 */
export function validParam(
  validator?: ValidationLogic<string, HTTPContext, { value: string }>,
  defaultValue: string = ""
) {
  return class ParamValidator {
    value: string;
    constructor(raw: any) {
      this.value = typeof raw === "string" ? raw : String(raw ?? defaultValue);
    }
    async validate(c: HTTPContext) {
      if (validator) await validator(this.value, c, this);
    }
  };
}

/**
 * Creates a Class that validates a Header (defaults to string).
 */
export function validHeader(
  validator?: ValidationLogic<string, HTTPContext, { value: string }>,
  defaultValue: string = ""
) {
  return class HeaderValidator {
    value: string;
    constructor(raw: any) {
      this.value = typeof raw === "string" ? raw : String(raw ?? defaultValue);
    }
    async validate(c: HTTPContext) {
      if (validator) await validator(this.value, c, this);
    }
  };
}

/**
 * Creates a Class that validates a WebSocket Message (defaults to string).
 */
export function validWSMessage(
  validator?: ValidationLogic<string, WSContext, { value: string }>,
  defaultValue: string = ""
) {
  return class WSMessageValidator {
    value: string;
    constructor(raw: any) {
      if (Buffer.isBuffer(raw)) {
        this.value = raw.toString();
      } else {
        this.value = typeof raw === "string" ? raw : String(raw ?? defaultValue);
      }
    }
    async validate(c: WSContext) {
      if (validator) await validator(this.value, c, this);
    }
  };
}