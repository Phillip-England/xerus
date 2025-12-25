// --- START FILE: src/std/Response.ts ---
import { HTTPContext } from "../HTTPContext";
import { SystemErrCode } from "../SystemErrCode";
import { ContextState } from "../ContextState";
import { href } from "../Href";
import type { CookieOptions } from "../CookieOptions";
import { SystemErr } from "../SystemErr";

export function setStatus(c: HTTPContext, code: number): void {
  c.ensureConfigurable();
  c.res.setStatus(code);
}

export function status(c: HTTPContext, code: number): void {
  setStatus(c, code);
}

export function setHeader(c: HTTPContext, name: string, value: string): void {
  c.ensureConfigurable();
  if (/[\r\n]/.test(value)) {
    throw new SystemErr(
      SystemErrCode.INTERNAL_SERVER_ERR,
      `Attempted to set invalid header: ${name}`,
    );
  }
  c.res.headers.set(name, value);
}

export function appendHeader(c: HTTPContext, name: string, value: string): void {
  c.ensureConfigurable();
  if (/[\r\n]/.test(value)) {
    throw new SystemErr(
      SystemErrCode.INTERNAL_SERVER_ERR,
      `Attempted to set invalid header: ${name}`,
    );
  }
  c.res.headers.append(name, value);
}

export function html(c: HTTPContext, content: string, code?: number): void {
  c.ensureBodyModifiable();
  setHeader(c, "Content-Type", "text/html");
  if (code !== undefined) c.res.setStatus(code);
  c.res.body(content);
  c.finalize();
}

export function text(c: HTTPContext, content: string, code?: number): void {
  c.ensureBodyModifiable();
  if (!c.res.headers.get("Content-Type")) {
    setHeader(c, "Content-Type", "text/plain");
  }
  if (code !== undefined) c.res.setStatus(code);
  c.res.body(content);
  c.finalize();
}

export function json(c: HTTPContext, data: any, code?: number): void {
  c.ensureBodyModifiable();
  setHeader(c, "Content-Type", "application/json");
  if (code !== undefined) c.res.setStatus(code);
  c.res.body(JSON.stringify(data));
  c.finalize();
}

export function errorJSON(
  c: HTTPContext,
  status: number,
  code: string,
  message: string,
  extra?: Record<string, any>,
): void {
  c.ensureBodyModifiable();
  setHeader(c, "Content-Type", "application/json");
  c.res.setStatus(status);
  c.res.body(
    JSON.stringify({
      error: { code, message, ...(extra ?? {}) },
    }),
  );
  c.finalize();
}

export function redirect(
  c: HTTPContext,
  path: string,
  query?: Record<string, any>,
  status: number = 302,
): void {
  c.ensureConfigurable();
  let location = path;

  if (query) {
    const q: Record<string, string | number | boolean | null | undefined> = {};
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      q[key] = value as any;
    }
    location = href(path, q);
  }

  if (/[\r\n]/.test(location)) {
    throw new SystemErr(
      SystemErrCode.INTERNAL_SERVER_ERR,
      "Redirect location contains invalid characters.",
    );
  }

  c.res.setStatus(status);
  c.res.headers.set("Location", location);
  c.finalize();
}

export function stream(c: HTTPContext, stream: ReadableStream): void {
  c.ensureConfigurable();
  setHeader(c, "Content-Type", "application/octet-stream");
  c.res.body(stream);
  c._state = ContextState.STREAMING;
}

export async function file(c: HTTPContext, path: string): Promise<void> {
  c.ensureBodyModifiable();
  c.ensureConfigurable();
  const f = Bun.file(path);
  if (!(await f.exists())) {
    throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, `file does not exist at ${path}`);
  }
  c.res.headers.set("Content-Type", f.type || "application/octet-stream");
  c.res.body(f);
  c.finalize();
}

/**
 * Canonical cookie writers (go through c.cookies.response).
 */
export function setCookie(
  c: HTTPContext,
  name: string,
  value: string,
  options?: CookieOptions,
): void {
  c.ensureConfigurable();
  c.cookies.response.set(name, value, options ?? {});
}

export function clearCookie(
  c: HTTPContext,
  name: string,
  options?: { path?: string; domain?: string },
): void {
  c.ensureConfigurable();
  c.cookies.response.clear(name, options);
}
// --- END FILE: src/std/Response.ts ---
