import { SystemErrCode } from "./SystemErrCode";
import { HTTPContext } from "./HTTPContext";
import { SystemErr } from "./SystemErr";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";

// Change type to HTTPErrorHandlerFunc so it accepts (c, err)
export const SystemErrRecord: Record<SystemErrCode, HTTPErrorHandlerFunc> = {
  [SystemErrCode.FILE_NOT_FOUND]: async (c: HTTPContext, err: any) => {
    // We can use the passed 'err' or fallback to c.getErr() if needed
    const e = (err instanceof SystemErr ? err : c.getErr()) as SystemErr;
    c.errorJSON(
      404,
      SystemErrCode.FILE_NOT_FOUND,
      e?.message || "File not found",
    );
  },

  [SystemErrCode.BODY_PARSING_FAILED]: async (c: HTTPContext, err: any) => {
    const e = (err instanceof SystemErr ? err : c.getErr()) as SystemErr;
    c.errorJSON(
      400,
      SystemErrCode.BODY_PARSING_FAILED,
      e?.message || "Body parsing failed",
    );
  },

  [SystemErrCode.ROUTE_ALREADY_REGISTERED]: async (
    c: HTTPContext,
    err: any,
  ) => {
    const e = (err instanceof SystemErr ? err : c.getErr()) as SystemErr;
    c.errorJSON(
      409,
      SystemErrCode.ROUTE_ALREADY_REGISTERED,
      e?.message || "Route already registered",
    );
  },

  [SystemErrCode.ROUTE_NOT_FOUND]: async (c: HTTPContext, err: any) => {
    const e = (err instanceof SystemErr ? err : c.getErr()) as SystemErr;
    c.errorJSON(
      404,
      SystemErrCode.ROUTE_NOT_FOUND,
      e?.message || "Route not found",
    );
  },

  [SystemErrCode.VALIDATION_FAILED]: async (c: HTTPContext, err: any) => {
    // 'err' here is likely the Zod error or custom error object
    const issues = err?.issues ?? err?.errors ?? err?.detail ?? err?.data ??
      undefined;

    const detail = typeof err?.message === "string" && err.message.length > 0
      ? err.message
      : "Validation failed";

    c.errorJSON(400, SystemErrCode.VALIDATION_FAILED, "Validation Failed", {
      detail,
      ...(issues !== undefined ? { issues } : {}),
    });
  },

  [SystemErrCode.INTERNAL_SERVER_ERR]: async (c: HTTPContext, err: any) => {
    const e = (err instanceof SystemErr ? err : c.getErr()) as SystemErr;
    c.errorJSON(
      500,
      SystemErrCode.INTERNAL_SERVER_ERR,
      "Internal Server Error",
      {
        detail: e?.message || "Unknown error",
      },
    );
  },

  [SystemErrCode.WEBSOCKET_UPGRADE_FAILURE]: async (
    c: HTTPContext,
    err: any,
  ) => {
    const e = (err instanceof SystemErr ? err : c.getErr()) as SystemErr;
    c.errorJSON(
      500,
      SystemErrCode.WEBSOCKET_UPGRADE_FAILURE,
      e?.message || "WebSocket upgrade failed",
    );
  },

  [SystemErrCode.HEADERS_ALREADY_SENT]: async (c: HTTPContext, err: any) => {
    const e = (err instanceof SystemErr ? err : c.getErr()) as SystemErr;
    console.error(`[CRITICAL] ${e?.message}`);
  },

  [SystemErrCode.MIDDLEWARE_ERROR]: async (c: HTTPContext, err: any) => {
    const e = (err instanceof SystemErr ? err : c.getErr()) as SystemErr;
    console.error(`[DEVELOPER ERROR] ${e?.message}`);
    c.errorJSON(500, SystemErrCode.MIDDLEWARE_ERROR, "Middleware Logic Error", {
      hint: "Ensure you use 'await next()' instead of just 'next()'",
      detail: e?.message,
    });
  },
};
