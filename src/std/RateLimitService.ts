import type { HTTPContext } from "../HTTPContext";
import type { ServiceLifecycle } from "../RouteFields";
import { errorJSON, setHeader } from "./Response";
import { clientIP } from "./Request";

export interface RateLimitConfig {
  /**
   * Max number of connections during windowMs.
   * Default: 100
   */
  limit?: number;

  /**
   * Time frame for which requests are checked/remembered (in milliseconds).
   * Default: 60000 (1 minute)
   */
  windowMs?: number;

  /**
   * Error message sent to client when limit is reached.
   */
  message?: string;

  /**
   * HTTP status code. Default: 429
   */
  statusCode?: number;

  /**
   * Function to generate a unique key for the client.
   * Default: clientIP(c)
   */
  keyGenerator?: (c: HTTPContext) => string;

  /**
   * If true, adds X-RateLimit headers to the response.
   * Default: true
   */
  standardHeaders?: boolean;
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

export class RateLimitService implements ServiceLifecycle {
  // Shared state across all instances of the service
  private static store = new Map<string, RateLimitState>();

  protected config: Required<Omit<RateLimitConfig, "keyGenerator">> & {
    keyGenerator: (c: HTTPContext) => string;
  };

  /**
   * To create a custom limiter, extend this class and pass options to super().
   * Example:
   * class LoginLimiter extends RateLimitService {
   * constructor() { super({ limit: 5, windowMs: 60 * 1000 }); }
   * }
   */
  constructor(config?: RateLimitConfig) {
    this.config = {
      limit: config?.limit ?? 100,
      windowMs: config?.windowMs ?? 60000,
      message: config?.message ?? "Too many requests, please try again later.",
      statusCode: config?.statusCode ?? 429,
      standardHeaders: config?.standardHeaders ?? true,
      keyGenerator: config?.keyGenerator ?? ((c) => clientIP(c)),
    };
  }

  /**
   * Garbage collection helper to prevent memory leaks in long-running processes.
   * (Ideally, run this on a generic interval, but here we run it lazily or could expose it).
   */
  static prune() {
    const now = Date.now();
    for (const [key, val] of this.store.entries()) {
      if (val.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  async before(c: HTTPContext): Promise<void> {
    const now = Date.now();
    
    // 1. Generate the unique key (e.g. IP address)
    // We prefix it with the limit/window to allow different rate limits for the same IP 
    // on different routes if multiple RateLimitServices are used.
    const keyPrefix = `${this.config.limit}:${this.config.windowMs}:`;
    const clientKey = this.config.keyGenerator(c);
    const storageKey = keyPrefix + clientKey;

    // 2. Get or Initialize State
    let record = RateLimitService.store.get(storageKey);

    // 3. Reset if window expired
    if (!record || record.resetTime < now) {
      record = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
      RateLimitService.store.set(storageKey, record);
    }

    // 4. Increment
    record.count++;

    // 5. Set Standard Headers (Draft-7)
    if (this.config.standardHeaders) {
      const remaining = Math.max(0, this.config.limit - record.count);
      const resetDate = new Date(record.resetTime).toUTCString();
      
      setHeader(c, "X-RateLimit-Limit", String(this.config.limit));
      setHeader(c, "X-RateLimit-Remaining", String(remaining));
      setHeader(c, "X-RateLimit-Reset", resetDate);
    }

    // 6. Check Limit
    if (record.count > this.config.limit) {
      errorJSON(c, this.config.statusCode, "RATE_LIMITED", this.config.message);
    }
  }
}