import { HTTPContext } from "./HTTPContext";
import { WSContext } from "./WSContext";

// Type definition for the user-supplied validation logic
type ValidationLogic<T, C> = (value: T, c: C) => void | Promise<void>;

/**
 * Creates a Class that validates a Query parameter (defaults to string).
 * * @param validator Optional function to run custom validation logic.
 * @param defaultValue Default value if the raw input is null/undefined.
 */
export function validQuery(
  validator?: ValidationLogic<string, HTTPContext>,
  defaultValue: string = ""
) {
  return class QueryValidator {
    value: string;
    constructor(raw: any) {
      this.value = typeof raw === "string" ? raw : String(raw ?? defaultValue);
    }
    async validate(c: HTTPContext) {
      if (validator) await validator(this.value, c);
    }
  };
}

/**
 * Creates a Class that validates a Path Parameter (defaults to string).
 * * @param validator Optional function to run custom validation logic.
 * @param defaultValue Default value if the raw input is null/undefined.
 */
export function validParam(
  validator?: ValidationLogic<string, HTTPContext>,
  defaultValue: string = ""
) {
  return class ParamValidator {
    value: string;
    constructor(raw: any) {
      this.value = typeof raw === "string" ? raw : String(raw ?? defaultValue);
    }
    async validate(c: HTTPContext) {
      if (validator) await validator(this.value, c);
    }
  };
}

/**
 * Creates a Class that validates a Header (defaults to string).
 * * @param validator Optional function to run custom validation logic.
 * @param defaultValue Default value if the raw input is null/undefined.
 */
export function validHeader(
  validator?: ValidationLogic<string, HTTPContext>,
  defaultValue: string = ""
) {
  return class HeaderValidator {
    value: string;
    constructor(raw: any) {
      this.value = typeof raw === "string" ? raw : String(raw ?? defaultValue);
    }
    async validate(c: HTTPContext) {
      if (validator) await validator(this.value, c);
    }
  };
}

/**
 * Creates a Class that validates a WebSocket Message (defaults to string).
 * Automatically converts Buffers to Strings.
 * * @param validator Optional function to run custom validation logic.
 * @param defaultValue Default value if the raw input is null/undefined.
 */
export function validWSMessage(
  validator?: ValidationLogic<string, WSContext>,
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
      if (validator) await validator(this.value, c);
    }
  };
}