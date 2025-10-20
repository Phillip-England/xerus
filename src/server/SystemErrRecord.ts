import { SystemErrCode } from "./SystemErrCode";
import { HTTPContext } from "./HTTPContext";
import { SystemErr } from "./SystemErr";
import type { HTTPHandlerFunc } from "./HTTPHandlerFunc";

export const SystemErrRecord: Record<SystemErrCode, HTTPHandlerFunc> = {
  [SystemErrCode.FILE_NOT_FOUND]: async (c: HTTPContext) => {
    let err = c.getErr() as SystemErr;
    return c.setStatus(404).text(err.message);
  },
  [SystemErrCode.BODY_PARSING_FAILED]: async (c: HTTPContext) => {
    let err = c.getErr() as SystemErr;
    return c.setStatus(400).text(err.message);
  },
  [SystemErrCode.ROUTE_ALREADY_REGISTERED]: async (c: HTTPContext) => {
    let err = c.getErr() as SystemErr;
    return c.setStatus(409).text(err.message); 
  },
  [SystemErrCode.ROUTE_NOT_FOUND]: async (c: HTTPContext) => {
    let err = c.getErr() as SystemErr;
    return c.setStatus(404).text(err.message); 
  },
  [SystemErrCode.INTERNAL_SERVER_ERR]: async (c: HTTPContext) => {
    let err = c.getErr() as SystemErr
    return c.setStatus(500).text("Xerus Internal Server Error\n\nTo Make You App Safe For Production\nSetup Your Own Error Handling:\n\napp.onErr(async (c: HTTPContext): Promise<Response> => {\n\tlet err = c.getErr()\n\tconsole.error(err)\n\treturn c.setStatus(500).text('Internal Server Error')\n})\n\nError Message:\n"+err.message)
  },
  [SystemErrCode.WEBSOCKET_UPGRADE_FAILURE]: async (c: HTTPContext) => {
    let err = c.getErr() as SystemErr
    return c.setStatus(500).text(err.message)
  }
};