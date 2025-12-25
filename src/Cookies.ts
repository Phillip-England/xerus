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

/**
 * CookieJar is RESPONSE-only: it stores Set-Cookie lines to be sent out.
 * Request cookie parsing belongs to HTTPContext (via RequestCookies below).
 */
export class CookieJar {
  private setCookies: string[] = [];

  reset(): void {
    this.setCookies = [];
  }

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

  set(value: string, options: CookieOptions = {}): this {
    this.jar.set(this._name, value, options);
    return this;
  }

  clear(options?: { path?: string; domain?: string }): this {
    this.jar.clear(this._name, options);
    return this;
  }
}

/**
 * RequestCookies parses from the inbound Cookie header.
 * It is NOT backed by the response jar.
 */
export class RequestCookies {
  private header: string | null = null;
  private parsed: Record<string, string> | null = null;

  reset(cookieHeader: string | null) {
    this.header = cookieHeader;
    this.parsed = null;
  }

  private ensureParsed() {
    if (this.parsed) return;
    this.parsed = this.header ? parseCookieHeader(this.header) : {};
  }

  get(name: string): string | undefined {
    this.ensureParsed();
    return this.parsed![name];
  }

  ref(name: string): RequestCookieRef {
    return new RequestCookieRef(this, name);
  }
}

/**
 * ResponseCookies writes Set-Cookie lines via the response jar.
 */
export class ResponseCookies {
  constructor(private jar: CookieJar) {}

  set(name: string, value: string, options: CookieOptions = {}) {
    this.jar.set(name, value, options);
  }

  clear(name: string, options?: { path?: string; domain?: string }) {
    this.jar.clear(name, options);
  }

  ref(name: string): ResponseCookieRef {
    return new ResponseCookieRef(this, name);
  }
}

export class RequestCookieRef {
  constructor(private view: RequestCookies, private _name: string) {}

  get name() {
    return this._name;
  }

  get(): string | undefined {
    return this.view.get(this._name);
  }
}

export class ResponseCookieRef {
  constructor(private writer: ResponseCookies, private _name: string) {}

  get name() {
    return this._name;
  }

  set(value: string, options: CookieOptions = {}): this {
    this.writer.set(this._name, value, options);
    return this;
  }

  clear(options?: { path?: string; domain?: string }): this {
    this.writer.clear(this._name, options);
    return this;
  }
}
