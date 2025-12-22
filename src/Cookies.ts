// src/Cookies.ts
import type { CookieOptions } from "./CookieOptions";

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function safeEncode(v: string) {
  try {
    return encodeURIComponent(v);
  } catch {
    return v;
  }
}

/**
 * Parse Cookie header into { name: value }
 */
export function parseCookieHeader(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = header.split(";");
  for (const part of parts) {
    const s = part.trim();
    if (!s) continue;
    const eq = s.indexOf("=");
    if (eq === -1) continue;
    const k = s.slice(0, eq).trim();
    const v = s.slice(eq + 1);
    if (!k) continue;
    out[k] = safeDecode(v);
  }
  return out;
}

export function serializeSetCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  let cookieString = `${name}=${safeEncode(value)}`;

  const path = options.path ?? "/";
  const httpOnly = options.httpOnly ?? true;
  const sameSite = options.sameSite ?? "Lax";

  if (path) cookieString += `; Path=${path}`;
  if (options.domain) cookieString += `; Domain=${options.domain}`;
  if (options.maxAge !== undefined) cookieString += `; Max-Age=${options.maxAge}`;
  if (options.expires) cookieString += `; Expires=${options.expires.toUTCString()}`;
  if (httpOnly) cookieString += `; HttpOnly`;
  if (options.secure) cookieString += `; Secure`;
  if (sameSite) cookieString += `; SameSite=${sameSite}`;

  return cookieString;
}

export class CookieJar {
  private reqCookieHeader: string | null = null;
  private reqParsed: Record<string, string> | null = null;

  // outgoing set-cookie lines
  private setCookies: string[] = [];

  resetRequest(cookieHeader: string | null) {
    this.reqCookieHeader = cookieHeader;
    this.reqParsed = null;
  }

  resetResponse() {
    this.setCookies = [];
  }

  private ensureParsed() {
    if (this.reqParsed) return;
    this.reqParsed = this.reqCookieHeader
      ? parseCookieHeader(this.reqCookieHeader)
      : {};
  }

  /**
   * Read request cookie value
   */
  get(name: string): string | undefined {
    this.ensureParsed();
    return this.reqParsed![name];
  }

  /**
   * Add Set-Cookie line to response
   */
  set(name: string, value: string, options: CookieOptions = {}) {
    this.setCookies.push(serializeSetCookie(name, value, options));
  }

  clear(name: string, options?: { path?: string; domain?: string }) {
    this.set(name, "", {
      path: options?.path ?? "/",
      domain: options?.domain,
      maxAge: 0,
      expires: new Date(0),
    });
  }

  /**
   * Response builder reads these
   */
  getSetCookieLines(): string[] {
    return this.setCookies.slice();
  }

  ref(name: string): CookieRef {
    return new CookieRef(this, name);
  }
}

export class CookieRef {
  private jar: CookieJar;
  private _name: string;

  constructor(jar: CookieJar, name: string) {
    this.jar = jar;
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  get(): string | undefined {
    return this.jar.get(this._name);
  }

  set(value: string, options: CookieOptions = {}): this {
    this.jar.set(this._name, value, options);
    return this;
  }

  clear(options?: { path?: string; domain?: string }): this {
    this.jar.clear(this._name, options);
    return this;
  }
}
