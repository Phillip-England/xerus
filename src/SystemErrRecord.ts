import { HTTPContext } from "./HTTPContext";
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import { errorJSON } from "./std/Response";
import { SystemErrCode } from "./SystemErrCode";
import { SystemErr } from "./SystemErr";

export const SystemErrRecord: Record<SystemErrCode, HTTPErrorHandlerFunc> = {
  [SystemErrCode.FILE_NOT_FOUND]: async (c: HTTPContext, err: any) => {
    const e = (err instanceof SystemErr ? err : c.err) as SystemErr;
    errorJSON(c, 404, SystemErrCode.FILE_NOT_FOUND, e?.message || "File not found");
  },

  [SystemErrCode.BODY_PARSING_FAILED]: async (c: HTTPContext, err: any) => {
    const e = (err instanceof SystemErr ? err : c.err) as SystemErr;
    errorJSON(c, 400, SystemErrCode.BODY_PARSING_FAILED, e?.message || "Body parsing failed");
  },

  [SystemErrCode.ROUTE_ALREADY_REGISTERED]: async (c: HTTPContext, err: any) => {
    const e = (err instanceof SystemErr ? err : c.err) as SystemErr;
    errorJSON(c, 409, SystemErrCode.ROUTE_ALREADY_REGISTERED, e?.message || "Route already registered");
  },

  [SystemErrCode.ROUTE_NOT_FOUND]: async (c: HTTPContext, err: any) => {
    const e = (err instanceof SystemErr ? err : c.err) as SystemErr;
    errorJSON(c, 404, SystemErrCode.ROUTE_NOT_FOUND, e?.message || "Route not found");
  },

  [SystemErrCode.VALIDATION_FAILED]: async (c: HTTPContext, err: any) => {
    const issues = err?.issues ?? err?.errors ?? err?.detail ?? err?.data ?? undefined;
    const detail =
      typeof err?.message === "string" && err.message.length > 0
        ? err.message
        : "Validation failed";

    errorJSON(c, 400, SystemErrCode.VALIDATION_FAILED, "Validation Failed", {
      detail,
      ...(issues !== undefined ? { issues } : {}),
    });
  },

  [SystemErrCode.INTERNAL_SERVER_ERR]: async (c: HTTPContext, err: any) => {
    const e = (err instanceof SystemErr ? err : c.err) as SystemErr;
    errorJSON(c, 500, SystemErrCode.INTERNAL_SERVER_ERR, "Internal Server Error", {
      detail: e?.message || "Unknown error",
    });
  },

  [SystemErrCode.WEBSOCKET_UPGRADE_FAILURE]: async (c: HTTPContext, err: any) => {
    const e = (err instanceof SystemErr ? err : c.err) as SystemErr;
    errorJSON(c, 500, SystemErrCode.WEBSOCKET_UPGRADE_FAILURE, e?.message || "WebSocket upgrade failed");
  },

  [SystemErrCode.HEADERS_ALREADY_SENT]: async (c: HTTPContext, err: any) => {
    const e = (err instanceof SystemErr ? err : c.err) as SystemErr;
    console.error(`[CRITICAL] ${e?.message}`);
  },
};
