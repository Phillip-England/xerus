
import { SystemErrCode } from "./SystemErrCode";
import { HTTPContext } from "./HTTPContext";
import { SystemErr } from "./SystemErr";
import type { HTTPHandlerFunc } from "./HTTPHandlerFunc";

export const SystemErrRecord: Record<SystemErrCode, HTTPHandlerFunc> = {
  [SystemErrCode.FILE_NOT_FOUND]: (c: HTTPContext) => {
    let err = c.getErr() as SystemErr;
    c.setStatus(404).text(err.message);
  },
  [SystemErrCode.BODY_PARSING_FAILED]: (c: HTTPContext) => {
    let err = c.getErr() as SystemErr;
    c.setStatus(400).text(err.message);
  },
  [SystemErrCode.ROUTE_ALREADY_REGISTERED]: (c: HTTPContext) => {
    let err = c.getErr() as SystemErr;
    c.setStatus(409).text(err.message);
  },
  [SystemErrCode.ROUTE_NOT_FOUND]: (c: HTTPContext) => {
    let err = c.getErr() as SystemErr;
    c.setStatus(404).text(err.message);
  },
  [SystemErrCode.INTERNAL_SERVER_ERR]: (c: HTTPContext) => {
    let err = c.getErr() as SystemErr;
    c.setStatus(500).text("Internal Server Error\n\n" + err.message);
  },
  [SystemErrCode.WEBSOCKET_UPGRADE_FAILURE]: (c: HTTPContext) => {
    let err = c.getErr() as SystemErr;
    c.setStatus(500).text(err.message);
  },
  [SystemErrCode.HEADERS_ALREADY_SENT]: (c: HTTPContext) => {
    let err = c.getErr() as SystemErr;
    // We cannot set status or text if headers are sent, so we log it 
    // and rely on the existing response or framework panic handling.
    console.error(`[CRITICAL] ${err.message}`);
  },
};