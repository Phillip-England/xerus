import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { z } from "zod";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import type { TypeValidator } from "../src/TypeValidator";
import { CORSService } from "../src/CORSService";
import { RateLimitService } from "../src/RateLimitService";
import { json, setHeader } from "../src/std/Response";
import { parseBody } from "../src/std/Body";
import { BodyType } from "../src/BodyType";
import { SystemErr } from "../src/SystemErr";
import { SystemErrCode } from "../src/SystemErrCode";

describe("Validation & Security", () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    const app = new Xerus();

    // --- Validators ---
    const loginSchema = z.object({
        username: z.string(),
        password: z.string().min(6)
    });

    class LoginValidator implements TypeValidator {
        async validate(c: HTTPContext) {
            const raw = await parseBody(c, BodyType.JSON);
            try {
                return await loginSchema.parseAsync(raw);
            } catch (e) {
                throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid Login");
            }
        }
    }

    // --- Routes ---
    class LoginRoute extends XerusRoute {
        method = Method.POST;
        path = "/login";
        validators = [LoginValidator];
        async handle(c: HTTPContext) {
            const data = c.validated(LoginValidator);
            json(c, { welcome: data.username });
        }
    }

    class CorsRoute extends XerusRoute {
        method = Method.GET;
        path = "/cors";
        services = [CORSService]; // Default CORS
        async handle(c: HTTPContext) { json(c, { ok: true }); }
    }

    class LimitRoute extends XerusRoute {
        method = Method.GET;
        path = "/limit";
        // Limit 2 requests per minute
        services = [class extends RateLimitService { constructor() { super({ limit: 2, windowMs: 60000 }); } }];
        async handle(c: HTTPContext) { json(c, { ok: true }); }
    }

    app.mount(LoginRoute, CorsRoute, LimitRoute);
    server = await app.listen(0);
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop(true);
  });

  test("Validation: Success", async () => {
    const res = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "password123" })
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.welcome).toBe("admin");
  });

  test("Validation: Failure (Password too short)", async () => {
    const res = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "123" })
    });
    expect(res.status).toBe(400); // 400 is default for validation fail
  });

  test("CORS: Sets headers", async () => {
      const res = await fetch(`${baseUrl}/cors`, {
          headers: { "Origin": "http://example.com" }
      });
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  test("RateLimit: Enforces limit", async () => {
      const headers = { "X-Forwarded-For": "1.1.1.1" };
      await fetch(`${baseUrl}/limit`, { headers }); // 1
      await fetch(`${baseUrl}/limit`, { headers }); // 2
      const res = await fetch(`${baseUrl}/limit`, { headers }); // 3
      expect(res.status).toBe(429);
  });
});