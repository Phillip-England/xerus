import type { HTTPContext } from "./HTTPContext";
import { Method } from "./Method";
import type { XerusService } from "./RouteFields";
import { errorJSON } from "./std/Response";

export interface CSRFConfig {
  /**
   * Name of the cookie to set.
   * Default: "XSRF-TOKEN" (standard for Angular/React)
   */
  cookieName?: string;

  /**
   * Name of the header to check on incoming requests.
   * Default: "X-XSRF-TOKEN"
   */
  headerName?: string;

  /**
   * HTTP methods to ignore validation for.
   * Default: ["GET", "HEAD", "OPTIONS", "TRACE"]
   */
  ignoreMethods?: string[];
}

export class CSRFService implements XerusService {
  // Configuration defaults
  private cookieName = "XSRF-TOKEN";
  private headerName = "X-XSRF-TOKEN";
  private ignoreMethods = [
    Method.GET,
    Method.HEAD,
    Method.OPTIONS,
    "TRACE"
  ];

  constructor(config?: CSRFConfig) {
    if (config?.cookieName) this.cookieName = config.cookieName;
    if (config?.headerName) this.headerName = config.headerName;
    if (config?.ignoreMethods) this.ignoreMethods = config.ignoreMethods;
  }

  /**
   * Generates a secure random token.
   */
  private generateToken(): string {
    return crypto.randomUUID();
  }

  async before(c: HTTPContext): Promise<void> {
    // 1. Retrieve the token from the request cookies (if it exists)
    let token = c.cookies.request.get(this.cookieName);

    // 2. If the token doesn't exist, generate a new one and set the cookie.
    // We set httpOnly to false so the client-side JS can read it and inject it into headers.
    if (!token) {
      token = this.generateToken();
      c.cookies.response.set(this.cookieName, token, {
        path: "/",
        httpOnly: false, 
        sameSite: "Lax",
        secure: false, // Set to true in production/HTTPS
      });
    }

    // 3. If this is a "Safe" method, we are done.
    if (this.ignoreMethods.includes(c.method as any)) {
      return;
    }

    // 4. For "Unsafe" methods, verify the header matches the cookie.
    const headerToken = c.req.headers.get(this.headerName);

    if (!headerToken || headerToken !== token) {
      // 5. Short-circuit the request with a 403 Forbidden
      errorJSON(c, 403, "CSRF_DETECTED", "Invalid or missing CSRF token");
      // Mark context as handled to stop further processing in Xerus (implied by finalizing response in errorJSON)
    }
  }
}