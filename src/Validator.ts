// PATH: /home/jacex/src/xerus/src/Validator.ts

import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import { BodyType } from "./BodyType";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { SourceType, type HTTPValidationSource } from "./ValidationSource";

export type ValidateFn<C, In = any, Out = any> = (c: C, value: In) => Out | Promise<Out>;

/**
 * Pipe a list of validator/transform functions.
 * Each function receives the previous function's output.
 */
export function pipeValidators<C>(...fns: ValidateFn<C, any, any>[]) {
  if (fns.length === 0) {
    throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "pipeValidators requires at least one function");
  }

  return async (c: C, initial: any) => {
    let v = initial;
    for (const fn of fns) v = await fn(c, v);
    return v;
  };
}

export function extractHTTPRaw(c: HTTPContext, source: HTTPValidationSource): Promise<any> | any {
  switch (source.type) {
    case SourceType.JSON:
      return c.parseBody(BodyType.JSON);

    case SourceType.FORM:
      return c.parseBody(BodyType.FORM);

    case SourceType.MULTIPART:
      return c.parseBody(BodyType.MULTIPART_FORM);

    case SourceType.TEXT:
      return c.parseBody(BodyType.TEXT);

    case SourceType.QUERY:
      return source.key ? c.query(source.key, "") : c.queries;

    case SourceType.PARAM:
      return c.getParam(source.key, "");

    case SourceType.HEADER:
      return c.getHeader(source.key);

    default:
      // exhaustive guard
      throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Unknown validation source");
  }
}

/**
 * HTTP validation middleware:
 *   route.validate(Source.QUERY("page"), "page", v.required(), v.asInt(), v.min(1))
 *
 * - Accepts ONE OR MANY validator functions.
 * - Each function receives the output of the previous one.
 */
export function HTTPValidator(
  source: HTTPValidationSource,
  outKey: string,
  ...fns: ValidateFn<HTTPContext, any, any>[]
) {
  // Back-compat: allow passing a single fn in older call sites that may do HTTPValidator(source, key, fn)
  // (TypeScript will still route it here via rest args.)
  if (fns.length === 0) {
    throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "HTTPValidator requires at least one validation function");
  }

  const composed = pipeValidators<HTTPContext>(...fns);

  return new Middleware(async (c: HTTPContext, next) => {
    let raw: any;

    try {
      raw = await extractHTTPRaw(c, source);
    } catch (e: any) {
      throw new SystemErr(
        SystemErrCode.BODY_PARSING_FAILED,
        `Data Extraction Failed: ${e?.message ?? String(e)}`,
      );
    }

    try {
      const validated = await composed(c, raw);
      c.validated.set(outKey, validated);
    } catch (e: any) {
      // Preserve the userland message; SystemErrRecord will wrap nicely.
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, e?.message ?? "Validation failed");
    }

    await next();
  });
}
