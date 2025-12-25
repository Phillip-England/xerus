import type { HTTPContext } from "./HTTPContext";
import { Method } from "./Method";
import type { ServiceLifecycle } from "./RouteFields";
import { header } from "./std/Request";
import { setHeader, setStatus } from "./std/Response";

export type OriginType =
  | string
  | string[]
  | RegExp
  | ((origin: string) => boolean)
  | boolean; // true = reflect request origin

export interface CORSConfig {
  /**
   * Configures the Access-Control-Allow-Origin header.
   * - `"*"` (default): Allows any origin.
   * - `true`: Reflects the request origin (dynamically allows whatever comes in).
   * - `string`: A specific single origin (e.g., "https://myapp.com").
   * - `string[]`: An allowlist of specific origins.
   * - `RegExp`: Matches origin against a pattern.
   * - `Function`: Custom logic returning boolean.
   */
  origin?: OriginType;

  /**
   * Configures the Access-Control-Allow-Methods header.
   * Default: "GET,HEAD,PUT,PATCH,POST,DELETE"
   */
  methods?: string | string[];

  /**
   * Configures the Access-Control-Allow-Headers header.
   * Default: Reflects the "Access-Control-Request-Headers" from the request.
   */
  allowedHeaders?: string | string[];

  /**
   * Configures the Access-Control-Expose-Headers header.
   */
  exposedHeaders?: string | string[];

  /**
   * Configures the Access-Control-Allow-Credentials header.
   * Set to true to pass the header, otherwise it is omitted.
   * Default: false
   */
  credentials?: boolean;

  /**
   * Configures the Access-Control-Max-Age header (in seconds).
   * Default: 86400 (24 hours)
   */
  maxAge?: number;

  /**
   * Status code to return for successful OPTIONS preflight requests.
   * Default: 204
   */
  optionsSuccessStatus?: number;
}

export class CORSService implements ServiceLifecycle {
  protected config: Required<CORSConfig>;

  constructor(config?: CORSConfig) {
    this.config = {
      origin: config?.origin ?? "*",
      methods: config?.methods ?? "GET,HEAD,PUT,PATCH,POST,DELETE",
      allowedHeaders: config?.allowedHeaders ?? [], // Empty means reflect request headers
      exposedHeaders: config?.exposedHeaders ?? [],
      credentials: config?.credentials ?? false,
      maxAge: config?.maxAge ?? 86400,
      optionsSuccessStatus: config?.optionsSuccessStatus ?? 204,
    };
  }

  private isOriginAllowed(origin: string, allowed: OriginType): boolean {
    if (allowed === "*") return true;
    if (allowed === true) return true;
    if (typeof allowed === "string") return origin === allowed;
    if (Array.isArray(allowed)) return allowed.includes(origin);
    if (allowed instanceof RegExp) return allowed.test(origin);
    if (typeof allowed === "function") return allowed(origin);
    return false;
  }

  async before(c: HTTPContext): Promise<void> {
    const reqOrigin = header(c, "Origin") || "";
    const method = c.method;

    // 1. Handle Origin
    let allowOriginVal = "";
    
    if (this.config.origin === "*") {
      // If credentials are true, we cannot use "*". We must reflect the origin.
      allowOriginVal = this.config.credentials ? reqOrigin : "*";
    } else if (this.isOriginAllowed(reqOrigin, this.config.origin)) {
      allowOriginVal = reqOrigin;
      setHeader(c, "Vary", "Origin");
    }

    if (allowOriginVal) {
      setHeader(c, "Access-Control-Allow-Origin", allowOriginVal);
    }

    // 2. Handle Credentials
    if (this.config.credentials) {
      setHeader(c, "Access-Control-Allow-Credentials", "true");
    }

    // 3. Handle Expose Headers
    if (this.config.exposedHeaders.length > 0) {
      const val = Array.isArray(this.config.exposedHeaders) 
        ? this.config.exposedHeaders.join(",") 
        : this.config.exposedHeaders;
      setHeader(c, "Access-Control-Expose-Headers", val);
    }

    // 4. Handle Preflight (OPTIONS)
    if (method === Method.OPTIONS) {
      // Methods
      const methodsVal = Array.isArray(this.config.methods) 
        ? this.config.methods.join(",") 
        : this.config.methods;
      setHeader(c, "Access-Control-Allow-Methods", methodsVal);

      // Allowed Headers
      let headersVal = "";
      if (Array.isArray(this.config.allowedHeaders) && this.config.allowedHeaders.length === 0) {
        // Default: reflect request headers
        headersVal = header(c, "Access-Control-Request-Headers") || "";
      } else {
        headersVal = Array.isArray(this.config.allowedHeaders) 
          ? this.config.allowedHeaders.join(",") 
          : this.config.allowedHeaders as string;
      }
      if (headersVal) {
        setHeader(c, "Access-Control-Allow-Headers", headersVal);
      }

      // Max Age
      if (this.config.maxAge) {
        setHeader(c, "Access-Control-Max-Age", String(this.config.maxAge));
      }

      // 5. Terminate Preflight
      setStatus(c, this.config.optionsSuccessStatus);
      c.finalize(); // Stop further execution, send 204
    }
  }
}