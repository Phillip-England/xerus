import { SystemErrCode } from "./SystemErrCode";

export class SystemErr extends Error {
  typeOf: SystemErrCode;
  constructor(typeOf: SystemErrCode, message: string) {
    super(`${typeOf}: ${message}`);
    this.typeOf = typeOf;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SystemErr);
    }
  }
}