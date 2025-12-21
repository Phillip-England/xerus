import type { MiddlewareFn } from "./MiddlewareFn";
import { HTTPContext } from "./HTTPContext";

export class Middleware<T extends Record<string, any> = Record<string, any>> {
  private callback: MiddlewareFn<T>;

  constructor(callback: MiddlewareFn<T>) {
    this.callback = callback;
  }

  async execute(c: HTTPContext<T>, next: () => Promise<void>): Promise<void> {
    return this.callback(c, next);
  }
}

export const logger = new Middleware<any>(async (c, next) => {
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
  return new Middleware<any>(async (c, next) => {
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

export const requestId = (opts?: {
  headerName?: string;
  storeKey?: string;
  generator?: () => string;
}) => {
  const headerName = opts?.headerName ?? "X-Request-Id";
  const storeKey = opts?.storeKey ?? "requestId";
  const gen = opts?.generator ?? (() => crypto.randomUUID());

  return new Middleware<any>(async (c, next) => {
    const incoming = c.getHeader(headerName) || c.getHeader(headerName.toLowerCase());
    const id = incoming && incoming.length > 0 ? incoming : gen();

    (c.data as any)[storeKey] = id;
    c.setHeader(headerName, id);

    await next();
  });
};

export const rateLimit = (opts: {
  windowMs: number;
  max: number;
  key?: (c: HTTPContext<any>) => string;
  message?: string;
}) => {
  const windowMs = opts.windowMs;
  const max = opts.max;
  const message = opts.message ?? "Rate limit exceeded";
  const keyFn = opts.key ?? ((c: HTTPContext<any>) => c.getClientIP() ?? "unknown");

  type Bucket = { count: number; resetAt: number };
  const buckets = new Map<string, Bucket>();

  return new Middleware<any>(async (c, next) => {
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
      c.errorJSON(429, "RATE_LIMITED", message, { retryAfterSec });
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

  return new Middleware<any>(async (c, next) => {
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
        (c.data as any).csrfToken = token;
      } else if (existing) {
        (c.data as any).csrfToken = existing;
      }
      await next();
      return;
    }

    const cookieToken = existing;
    const headerToken = c.getHeader(headerName) || c.getHeader(headerName.toLowerCase());

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      c.errorJSON(403, "CSRF_FAILED", "CSRF token missing or invalid", { cookieName, headerName });
      return;
    }

    (c.data as any).csrfToken = cookieToken;
    await next();
  });
};

export const timeout = (ms: number, opts?: { message?: string }) => {
  const detail = opts?.message ?? `Request timed out after ${ms}ms`;
  const TIMEOUT = Symbol("XERUS_TIMEOUT");

  return new Middleware<any>(async (c, next) => {
    let timer: any = null;

    // Start downstream, but *always* handle rejection so it never becomes "unhandled"
    const downstream = (async () => {
      await next();
    })().catch(() => {
      // swallow: timeout responses should not be overwritten by downstream errors
    });

    const timeoutPromise = new Promise<typeof TIMEOUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMEOUT), ms);
    });

    try {
      const winner = await Promise.race([downstream.then(() => "DOWNSTREAM" as const), timeoutPromise]);

      // Downstream finished first → normal path
      if (winner !== TIMEOUT) return;

      // Timeout won → lock the context and send response if nothing already wrote
      (c.data as any).__timeoutSent = true;

      if (!c.isDone) {
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

      // IMPORTANT: keep the context from being returned to the pool until downstream settles
      (c.data as any).__holdRelease = downstream;
      return;
    } finally {
      if (timer) clearTimeout(timer);
    }
  });
};



export const compress = (opts?: {
  thresholdBytes?: number;
  preferBrotli?: boolean;
}) => {
  const threshold = opts?.thresholdBytes ?? 1024;
  const preferBrotli = opts?.preferBrotli ?? true;

  function accepts(accept: string, enc: string) {
    return accept.toLowerCase().includes(enc);
  }

  function bodySize(body: any): number {
    if (typeof body === "string") return new TextEncoder().encode(body).byteLength;
    if (body instanceof Uint8Array) return body.byteLength;
    if (body instanceof ArrayBuffer) return body.byteLength;
    return 0;
  }

  function getBytes(body: any): Uint8Array | null {
    if (typeof body === "string") return new TextEncoder().encode(body);
    if (body instanceof ArrayBuffer) return new Uint8Array(body);
    if (body instanceof Uint8Array) return body;
    return null;
  }

  function makeSource(bytes: Uint8Array) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
  }

  function tryMakeCompressedStream(enc: "br" | "gzip", bytes: Uint8Array): ReadableStream<Uint8Array> | null {
    const CS = (globalThis as any).CompressionStream;
    if (!CS) return null;
    try {
      const cs = new CS(enc);
      return makeSource(bytes).pipeThrough(cs);
    } catch {
      return null;
    }
  }

  return new Middleware<any>(async (c, next) => {
    await next();

    const alreadyEncoded = !!c.getResHeader("Content-Encoding");
    if (alreadyEncoded) return;

    if (c.method.toUpperCase() === "HEAD") return;
    if (c.res.statusCode === 204 || c.res.statusCode === 304) return;

    const accept = c.getHeader("Accept-Encoding") || "";
    const wantsBr = preferBrotli && accepts(accept, "br");
    const wantsGzip = accepts(accept, "gzip");
    if (!wantsBr && !wantsGzip) return;

    const body = (c.res as any).getBody?.() ?? (c.res as any).bodyContent;
    if (body == null) return;
    if (typeof body !== "string" && !(body instanceof Uint8Array) && !(body instanceof ArrayBuffer)) return;

    const size = bodySize(body);
    if (size < threshold) return;

    const bytes = getBytes(body);
    if (!bytes) return;

    let enc: "br" | "gzip" | null = null;
    let stream: ReadableStream<Uint8Array> | null = null;

    if (wantsBr) {
      stream = tryMakeCompressedStream("br", bytes);
      if (stream) enc = "br";
    }
    if (!stream && wantsGzip) {
      stream = tryMakeCompressedStream("gzip", bytes);
      if (stream) enc = "gzip";
    }

    if (!stream || !enc) return;

    c.setHeader("Content-Encoding", enc);
    c.setHeader("Vary", "Accept-Encoding");
    c.res.body(stream);
  });
};
