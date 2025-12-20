// PATH: /home/jacex/src/xerus/src/Validator.ts

import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import { BodyType } from "./BodyType";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { Source } from "./ValidationSource";

export type ValidateFn<C, Raw, Out> = (c: C, raw: Raw) => Out | Promise<Out>;

function normalizeWsRawMessage(raw: any) {
  // HTTPContext stores ws message in _wsMessage; WSContext exposes message directly,
  // but this helper is mainly for parity if you ever call it.
  if (Buffer.isBuffer(raw)) return raw.toString();
  return raw;
}

export function extractHTTPRaw(c: HTTPContext, source: Source, key: string): Promise<any> | any {
  switch (source) {
    case Source.JSON:
      return c.parseBody(BodyType.JSON);

    case Source.FORM:
      return c.parseBody(BodyType.FORM);

    case Source.MULTIPART:
      return c.parseBody(BodyType.MULTIPART_FORM);

    case Source.TEXT:
      return c.parseBody(BodyType.TEXT);

    case Source.QUERY:
      return key ? c.query(key, "") : c.queries;

    case Source.PARAM:
      if (!key) throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Source.PARAM requires a key");
      return c.getParam(key, "");

    case Source.HEADER:
      if (!key) throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Source.HEADER requires a key");
      return c.getHeader(key);

    // WS sources are not supported in HTTP middleware (no ws handle available here)
    case Source.WS_MESSAGE:
    case Source.WS_CLOSE:
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        `WS validation source "${source}" can only be used on WSRoute.validate(...)`,
      );

    default:
      throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Unknown validation source");
  }
}

/**
 * HTTP validation middleware:
 *   route.validate(Source.QUERY, "page", (c, raw) => ...)
 */
export function HTTPValidator(
  source: Source,
  key: string,
  outKey: string,
  fn: ValidateFn<HTTPContext, any, any>,
) {
  return new Middleware(async (c: HTTPContext, next) => {
    let raw: any;
    try {
      raw = await extractHTTPRaw(c, source, key);
    } catch (e: any) {
      throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, `Data Extraction Failed: ${e?.message ?? String(e)}`);
    }

    try {
      // NOTE: for headers, raw might be null
      const validated = await fn(c, normalizeWsRawMessage(raw));
      c.validated.set(outKey, validated);
    } catch (e: any) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, e?.message ?? "Validation failed");
    }

    await next();
  });
}
