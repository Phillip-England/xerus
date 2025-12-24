import { HTTPContext } from "../HTTPContext";
import { RequestHeaders } from "../Headers";
import { SystemErr } from "../SystemErr";
import { SystemErrCode } from "../SystemErrCode";
import { WSContext } from "../WSContext";
import { type CookieRef } from "../Cookies";

export function url(c: HTTPContext): URL {
  if (!c._url) c._url = new URL(c.req.url);
  return c._url;
}

export function segments(c: HTTPContext): string[] {
  if (!c._segments) c._segments = c.path.split("/").filter(Boolean);
  return c._segments;
}

export function queries(c: HTTPContext): Record<string, string> {
  if (!c._url) c._url = new URL(c.req.url);
  return Object.fromEntries(c._url.searchParams.entries());
}

export function query(c: HTTPContext, key: string, defaultValue: string = ""): string {
  if (!c._url) c._url = new URL(c.req.url);
  return c._url.searchParams.get(key) ?? defaultValue;
}

export function param(c: HTTPContext, key: string, defaultValue: string = ""): string {
  return c.params[key] ?? defaultValue;
}

export function params(c: HTTPContext): Record<string, string> {
  return { ...c.params };
}

export function header(c: HTTPContext, name: string): string | null {
  return c.req.headers.get(name);
}

export function headers(c: HTTPContext): RequestHeaders {
  if(!c._reqHeaders) c._reqHeaders = new RequestHeaders(c.req.headers);
  return c._reqHeaders;
}

export function clientIP(c: HTTPContext): string {
  const xff = c.req.headers.get("x-forwarded-for") || c.req.headers.get("X-Forwarded-For");
  if (xff) return xff.split(",")[0].trim();
  const xrip = c.req.headers.get("x-real-ip") || c.req.headers.get("X-Real-IP");
  if (xrip) return xrip.trim();
  return "unknown";
}

export function ws(c: HTTPContext): WSContext {
    if (!c._wsContext) {
      throw new SystemErr(
        SystemErrCode.INTERNAL_SERVER_ERR,
        "WebSocket context is not available. Are you calling ws(c) from a non-WS route?",
      );
    }
    return c._wsContext;
}

export function isWs(c: HTTPContext): boolean {
    return c._wsContext != null;
}

export function getCookie(c: HTTPContext, name: string): CookieRef {
  return c.res.cookies.ref(name);
}