// PATH: /home/jacex/src/xerus/src/Middleware.ts

import type { MiddlewareFn } from "./MiddlewareFn";
import { HTTPContext } from "./HTTPContext";

export class Middleware<C = HTTPContext> {
  private callback: MiddlewareFn<C>;

  constructor(callback: MiddlewareFn<C>) {
    this.callback = callback;
  }

  async execute(c: C, next: () => Promise<void>): Promise<void> {
    return this.callback(c, next);
  }
}

export const logger = new Middleware(async (c: HTTPContext, next) => {
  const start = performance.now();
  await next();
  const duration = performance.now() - start;
  console.log(`[${c.req.method}][${c.path}][${duration.toFixed(2)}ms]`);
});

export interface CORSOptions {
  origin?: string;
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
}

export const cors = (options: CORSOptions = {}) => {
  return new Middleware(async (c: HTTPContext, next) => {
    let origin = options.origin || "*";
    const methods = options.methods?.join(", ") || "GET, POST, PUT, DELETE, PATCH, OPTIONS";
    const headers = options.headers?.join(", ") || "Content-Type, Authorization";

    if (options.credentials) {
      const reqOrigin = c.getHeader("Origin");
      if (origin === "*" && reqOrigin) {
        origin = reqOrigin;
      }
      c.setHeader("Access-Control-Allow-Credentials", "true");
    }

    c.setHeader("Access-Control-Allow-Origin", origin);
    c.setHeader("Access-Control-Allow-Methods", methods);
    c.setHeader("Access-Control-Allow-Headers", headers);

    if (c.method === "OPTIONS") {
      c.setStatus(204).text("");
      return;
    }

    await next();
  });
};

// ---------------------------------------------------------------------------
// Common Patterns Middleware
// ---------------------------------------------------------------------------

export const requestId = (opts?: {
  headerName?: string;
  storeKey?: string;
  generator?: () => string;
}) => {
  const headerName = opts?.headerName ?? "X-Request-Id";
  const storeKey = opts?.storeKey ?? "requestId";
  const gen = opts?.generator ?? (() => crypto.randomUUID());

  return new Middleware(async (c: HTTPContext, next) => {
    const incoming = c.getHeader(headerName) || c.getHeader(headerName.toLowerCase());
    const id = incoming && incoming.length > 0 ? incoming : gen();

    c.data[storeKey] = id;
    c.setHeader(headerName, id);

    await next();
  });
};

export const rateLimit = (opts: {
  windowMs: number;
  max: number;
  key?: (c: HTTPContext) => string;
  message?: string;
}) => {
  const windowMs = opts.windowMs;
  const max = opts.max;
  const message = opts.message ?? "Rate limit exceeded";

  const keyFn = opts.key ?? ((c: HTTPContext) => (c as any).getClientIP?.() ?? "unknown");

  type Bucket = { count: number; resetAt: number };
  const buckets = new Map<string, Bucket>();

  return new Middleware(async (c: HTTPContext, next) => {
    const now = Date.now();
    const key = keyFn(c);

    let b = buckets.get(key);
    if (!b || now >= b.resetAt) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(key, b);
    }

    b.count += 1;

    const remaining = Math.max(0, max - b.count);
    const retryAfterSec = Math.max(0, Math.ceil((b.resetAt - now) / 1000));

    c.setHeader("X-RateLimit-Limit", String(max));
    c.setHeader("X-RateLimit-Remaining", String(remaining));
    c.setHeader("X-RateLimit-Reset", String(Math.ceil(b.resetAt / 1000)));

    if (b.count > max) {
      c.setHeader("Retry-After", String(retryAfterSec));

      const fn = (c as any).tooManyRequests;
      if (typeof fn === "function") {
        fn.call(c, message, "RATE_LIMITED", { retryAfterSec });
      } else {
        c.errorJSON(429, "RATE_LIMITED", message, { retryAfterSec });
      }
      return;
    }

    await next();
  });
};

export const csrf = (opts?: {
  cookieName?: string;
  headerName?: string;
  secureCookie?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  path?: string;
  ignoreMethods?: string[];
  ensureCookieOnSafeMethods?: boolean;
}) => {
  const cookieName = opts?.cookieName ?? "csrf_token";
  const headerName = opts?.headerName ?? "x-csrf-token";
  const path = opts?.path ?? "/";
  const sameSite = opts?.sameSite ?? "Lax";
  const ignore = new Set((opts?.ignoreMethods ?? ["GET", "HEAD", "OPTIONS"]).map((m) => m.toUpperCase()));
  const ensureCookieOnSafeMethods = opts?.ensureCookieOnSafeMethods ?? true;

  const gen = () => crypto.randomUUID().replace(/-/g, "");

  return new Middleware(async (c: HTTPContext, next) => {
    const method = c.method.toUpperCase();

    const existing = c.getCookie(cookieName);

    if (ignore.has(method)) {
      if (ensureCookieOnSafeMethods && !existing) {
        const token = gen();
        c.setCookie(cookieName, token, {
          path,
          httpOnly: false,
          secure: opts?.secureCookie,
          sameSite,
        });
        c.data.csrfToken = token;
      } else if (existing) {
        c.data.csrfToken = existing;
      }
      await next();
      return;
    }

    const cookieToken = existing;
    const headerToken = c.getHeader(headerName) || c.getHeader(headerName.toLowerCase());

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      const fn = (c as any).forbidden;
      if (typeof fn === "function") {
        fn.call(c, "CSRF token missing or invalid", "CSRF_FAILED", { cookieName, headerName });
      } else {
        c.errorJSON(403, "CSRF_FAILED", "CSRF token missing or invalid", { cookieName, headerName });
      }
      return;
    }

    c.data.csrfToken = cookieToken;
    await next();
  });
};

/**
 * Timeout middleware (soft timeout)
 *
 * - Returns a 504 quickly if downstream takes too long.
 * - Does NOT rely on HTTPContext helpers after marking timed out (those early-return).
 * - Prevents the middleware safeguard from throwing by setting __timeoutSent.
 * - Keeps pooled contexts safe by holding release until downstream finishes.
 */
export const timeout = (ms: number, opts?: { message?: string }) => {
  const detail = opts?.message ?? `Request timed out after ${ms}ms`;
  const TIMEOUT = Symbol("XERUS_TIMEOUT");

  return new Middleware(async (c: HTTPContext, next) => {
    let timer: any;

    // Start downstream immediately
    const downstream = (async () => {
      await next();
    })();

    // A rejecting promise is easier to race cleanly.
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(TIMEOUT), ms);
    });

    try {
      // If downstream wins, we fully await it (satisfies safeguard).
      await Promise.race([downstream, timeoutPromise]);
      return;
    } catch (e) {
      if (e !== TIMEOUT) {
        // Real downstream error: let it bubble
        throw e;
      }

      // Timeout won:
      // 1) Mark first so any later writes become NO-OPs.
      c.data.__timeoutSent = true;

      // 2) Only write 504 if nothing has been written yet.
      if (!c.isDone) {
        // Write directly to MutResponse (HTTPContext helpers early-return once timed out)
        c.clearResponse();

        c.res.setStatus(504);
        c.res.setHeader("Content-Type", "application/json");
        c.res.body(
          JSON.stringify({
            error: {
              code: "TIMEOUT",
              message: "Gateway Timeout",
              detail,
            },
          }),
        );
        c.finalize();
      }

      // 3) Hold pool release until downstream finishes (prevents reuse races).
      (c.data as any).__holdRelease = downstream.catch(() => {});
      return;
    } finally {
      if (timer) clearTimeout(timer);
    }
  });
};

/**
 * Compression middleware (gzip / br)
 * - Uses CompressionStream when available.
 * - Only compresses string / Uint8Array / ArrayBuffer bodies (not Files/Blobs/Streams).
 */
export const compress = (opts?: {
  thresholdBytes?: number;
  preferBrotli?: boolean;
}) => {
  const threshold = opts?.thresholdBytes ?? 1024;
  const preferBrotli = opts?.preferBrotli ?? true;

  function pickEncoding(accept: string): "br" | "gzip" | null {
    const a = accept.toLowerCase();
    if (preferBrotli && a.includes("br")) return "br";
    if (a.includes("gzip")) return "gzip";
    return null;
  }

  function bodySize(body: any): number {
    if (typeof body === "string") return new TextEncoder().encode(body).byteLength;
    if (body instanceof Uint8Array) return body.byteLength;
    if (body instanceof ArrayBuffer) return body.byteLength;
    return 0;
  }

  return new Middleware(async (c: HTTPContext, next) => {
    await next();

    const alreadyEncoded = !!c.getResHeader("Content-Encoding");
    if (alreadyEncoded) return;

    if (c.method.toUpperCase() === "HEAD") return;
    if (c.res.statusCode === 204 || c.res.statusCode === 304) return;

    const accept = c.getHeader("Accept-Encoding") || "";
    const enc = pickEncoding(accept);
    if (!enc) return;

    const CS = (globalThis as any).CompressionStream;
    if (!CS) return;

    const body = (c.res as any).getBody?.() ?? (c.res as any).bodyContent;
    if (body == null) return;

    if (typeof body !== "string" && !(body instanceof Uint8Array) && !(body instanceof ArrayBuffer)) return;

    const size = bodySize(body);
    if (size < threshold) return;

    let bytes: Uint8Array;
    if (typeof body === "string") bytes = new TextEncoder().encode(body);
    else if (body instanceof ArrayBuffer) bytes = new Uint8Array(body);
    else bytes = body;

    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });

    const cs = new CS(enc);
    const compressedStream = source.pipeThrough(cs);

    c.setHeader("Content-Encoding", enc);
    c.setHeader("Vary", "Accept-Encoding");

    c.res.body(compressedStream);
  });
};
