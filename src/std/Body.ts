import { HTTPContext } from "../HTTPContext";
import { BodyType } from "../BodyType";
import { SystemErr } from "../SystemErr";
import { SystemErrCode } from "../SystemErrCode";

export type ParsedFormBodyLast = Record<string, string>;
export type ParsedFormBodyMulti = Record<string, string | string[]>;

export type ParseBodyOptions = {
  strict?: boolean;
  formMode?: "last" | "multi" | "params";
};

function assertReparseAllowed(c: HTTPContext, nextMode: string) {
  if (c._parsedBodyMode === "JSON" && nextMode === "FORM") {
    throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Body already parsed as JSON; re-parsing as FORM is not allowed.");
  }
  if (c._parsedBodyMode === "FORM" && nextMode === "JSON") {
    throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Body already parsed as FORM; re-parsing as JSON is not allowed.");
  }
  if (c._parsedBodyMode === "MULTIPART" && nextMode !== "MULTIPART") {
    throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Body already consumed as MULTIPART; it cannot be re-parsed.");
  }
  if (nextMode === "MULTIPART" && c._parsedBodyMode !== "NONE" && c._parsedBodyMode !== "MULTIPART") {
    throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Body already consumed as TEXT/JSON/FORM; it cannot be re-parsed as MULTIPART.");
  }
}

function contentType(c: HTTPContext): string {
  return (c.req.headers.get("Content-Type") || "").toLowerCase();
}

function enforceStrictContentType(c: HTTPContext, expectedType: BodyType, strict: boolean) {
  if (!strict) return;
  if (expectedType === BodyType.TEXT) return;
  const ct = contentType(c);
  if (expectedType === BodyType.JSON && !ct.includes("application/json")) {
    throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Expected Content-Type application/json");
  }
  if (expectedType === BodyType.FORM && !ct.includes("application/x-www-form-urlencoded")) {
    throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Expected Content-Type application/x-www-form-urlencoded");
  }
  if (expectedType === BodyType.MULTIPART_FORM && !ct.includes("multipart/form-data")) {
    throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Expected Content-Type multipart/form-data");
  }
}

function parseFormLast(text: string): ParsedFormBodyLast {
  return Object.fromEntries(new URLSearchParams(text)) as ParsedFormBodyLast;
}

function parseFormMulti(text: string): ParsedFormBodyMulti {
  const params = new URLSearchParams(text);
  const out: ParsedFormBodyMulti = {};
  for (const [k, v] of params.entries()) {
    const cur = out[k];
    if (cur === undefined) out[k] = v;
    else if (Array.isArray(cur)) cur.push(v);
    else out[k] = [cur, v];
  }
  return out;
}

export async function parseBody(c: HTTPContext, expectedType: BodyType, opts: ParseBodyOptions = {}): Promise<any> {
  const strict = !!opts.strict;
  enforceStrictContentType(c, expectedType, strict);

  // Fix: Check if client sent JSON when we expected FORM, even in non-strict mode
  const ct = contentType(c);
  if (expectedType === BodyType.FORM && ct.includes("application/json")) {
    throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected JSON data");
  }

  if (expectedType === BodyType.JSON && c._body !== undefined && c._parsedBodyMode === "JSON") return c._body;
  if (expectedType === BodyType.TEXT && c._rawBody !== null && ["TEXT", "JSON", "FORM"].includes(c._parsedBodyMode)) return c._rawBody;

  if (c._rawBody !== null) {
    if (expectedType === BodyType.JSON) {
      assertReparseAllowed(c, "JSON");
      try {
        const parsed = JSON.parse(c._rawBody);
        c._body = parsed;
        c._parsedBodyMode = "JSON";
        return parsed;
      } catch (err: any) {
        throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, `JSON parsing failed: ${err.message}`);
      }
    }
    if (expectedType === BodyType.FORM) {
      assertReparseAllowed(c, "FORM");
      const mode = opts.formMode ?? "last";
      const params = new URLSearchParams(c._rawBody);
      if (mode === "params") return params;
      const parsed = mode === "multi" ? parseFormMulti(c._rawBody) : parseFormLast(c._rawBody);
      c._body = parsed;
      c._parsedBodyMode = "FORM";
      return parsed;
    }
    if (expectedType === BodyType.TEXT) {
      c._parsedBodyMode = c._parsedBodyMode === "NONE" ? "TEXT" : c._parsedBodyMode;
      return c._rawBody;
    }
  }

  if (ct.includes("multipart/form-data")) {
    if (expectedType !== BodyType.MULTIPART_FORM) {
      throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, "Unexpected MULTIPART_FORM data");
    }
    assertReparseAllowed(c, "MULTIPART");
    const fd = await c.req.formData();
    c._body = fd;
    c._parsedBodyMode = "MULTIPART";
    return fd;
  }

  assertReparseAllowed(c, expectedType === BodyType.TEXT ? "TEXT" : expectedType === BodyType.JSON ? "JSON" : expectedType === BodyType.FORM ? "FORM" : "TEXT");

  const text = await c.req.text();
  c._rawBody = text;

  if (expectedType === BodyType.TEXT) {
    c._parsedBodyMode = "TEXT";
    return text;
  }

  if (expectedType === BodyType.JSON) {
    try {
      const parsed = JSON.parse(text);
      c._body = parsed;
      c._parsedBodyMode = "JSON";
      return parsed;
    } catch (err: any) {
      throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, `JSON parsing failed: ${err.message}`);
    }
  }

  if (expectedType === BodyType.FORM) {
    const mode = opts.formMode ?? "last";
    const params = new URLSearchParams(text);
    if (mode === "params") return params;
    const parsed = mode === "multi" ? parseFormMulti(text) : parseFormLast(text);
    c._body = parsed;
    c._parsedBodyMode = "FORM";
    return parsed;
  }

  c._parsedBodyMode = "TEXT";
  return text;
}

export function textBody(c: HTTPContext, opts?: ParseBodyOptions): Promise<string> {
  return parseBody(c, BodyType.TEXT, opts);
}

export function jsonBody<T = any>(c: HTTPContext, opts?: ParseBodyOptions): Promise<T> {
  return parseBody(c, BodyType.JSON, opts);
}

export function formBody(c: HTTPContext, opts?: Omit<ParseBodyOptions, "formMode">): Promise<ParsedFormBodyLast> {
  return parseBody(c, BodyType.FORM, { ...(opts ?? {}), formMode: "last" });
}

export function multipartBody(c: HTTPContext, opts?: ParseBodyOptions): Promise<FormData> {
  return parseBody(c, BodyType.MULTIPART_FORM, opts);
}