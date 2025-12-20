// PATH: /home/jacex/src/xerus/src/SystemErrRecord.ts

import { SystemErrCode } from "./SystemErrCode";
import { HTTPContext } from "./HTTPContext";
import { SystemErr } from "./SystemErr";
import type { HTTPHandlerFunc } from "./HTTPHandlerFunc";

export const SystemErrRecord: Record<SystemErrCode, HTTPHandlerFunc> = {
  [SystemErrCode.FILE_NOT_FOUND]: async (c: HTTPContext) => {
    const err = c.getErr() as SystemErr;
    c.errorJSON(404, SystemErrCode.FILE_NOT_FOUND, err.message);
  },

  [SystemErrCode.BODY_PARSING_FAILED]: async (c: HTTPContext) => {
    const err = c.getErr() as SystemErr;
    c.errorJSON(400, SystemErrCode.BODY_PARSING_FAILED, err.message);
  },

  [SystemErrCode.ROUTE_ALREADY_REGISTERED]: async (c: HTTPContext) => {
    const err = c.getErr() as SystemErr;
    c.errorJSON(409, SystemErrCode.ROUTE_ALREADY_REGISTERED, err.message);
  },

  [SystemErrCode.ROUTE_NOT_FOUND]: async (c: HTTPContext) => {
    const err = c.getErr() as SystemErr;
    c.errorJSON(404, SystemErrCode.ROUTE_NOT_FOUND, err.message);
  },

  [SystemErrCode.VALIDATION_FAILED]: async (c: HTTPContext) => {
    const err = c.getErr() as any;

    const issues =
      err?.issues ?? err?.errors ?? err?.detail ?? err?.data ?? undefined;

    const detail =
      typeof err?.message === "string" && err.message.length > 0
        ? err.message
        : "Validation failed";

    c.errorJSON(400, SystemErrCode.VALIDATION_FAILED, "Validation Failed", {
      detail,
      ...(issues !== undefined ? { issues } : {}),
    });
  },

  [SystemErrCode.INTERNAL_SERVER_ERR]: async (c: HTTPContext) => {
    const err = c.getErr() as SystemErr;
    c.errorJSON(500, SystemErrCode.INTERNAL_SERVER_ERR, "Internal Server Error", {
      detail: err.message,
    });
  },

  [SystemErrCode.WEBSOCKET_UPGRADE_FAILURE]: async (c: HTTPContext) => {
    const err = c.getErr() as SystemErr;
    c.errorJSON(500, SystemErrCode.WEBSOCKET_UPGRADE_FAILURE, err.message);
  },

  [SystemErrCode.HEADERS_ALREADY_SENT]: async (c: HTTPContext) => {
    const err = c.getErr() as SystemErr;
    // Cannot write headers/body safely; log only.
    console.error(`[CRITICAL] ${err.message}`);
  },

  [SystemErrCode.MIDDLEWARE_ERROR]: async (c: HTTPContext) => {
    const err = c.getErr() as SystemErr;

    // Keep your console signal for devs:
    console.error(`[DEVELOPER ERROR] ${err.message}`);

    // ✅ Canonical envelope everywhere:
    // { error: { code, message, hint, detail } }
    c.errorJSON(500, SystemErrCode.MIDDLEWARE_ERROR, "Middleware Logic Error", {
      hint: "Ensure you use 'await next()' instead of just 'next()'",
      detail: err.message, // includes your "did not await it" text
    });
  },
};
