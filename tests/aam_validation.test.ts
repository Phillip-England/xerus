import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { z } from "zod";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { BodyType } from "../src/BodyType";
import { HTTPContext } from "../src/HTTPContext";
import type { TypeValidator } from "../src/TypeValidator";

import { parseBody } from "../src/std/Body";
import { query } from "../src/std/Request";
import { json } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

async function readMaybeError(res: Response) {
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("application/json")) return await res.json();
  return await res.text();
}

// --- Zod schemas

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 chars"),
  email: z.string().email("Invalid email format"),
  age: z.number().min(18, "Must be 18 or older"),
});

const searchSchema = z.object({
  q: z.string().min(1, "Search query is required"),
  limit: z.number().max(100, "Limit cannot exceed 100"),
});

const loginSchema = z.object({
  username: z.string().min(1, "Missing credentials"),
  password: z.string().min(6, "Password too short"),
});

// --- Validators

class SignupValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    const raw = await parseBody(c, BodyType.JSON);
    const data = await signupSchema.parseAsync(raw);
    return { data };
  }
}

class SearchValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    const prepared = {
      q: query(c, "q") || "",
      limit: Number(query(c, "limit") || "10"),
    };
    const data = await searchSchema.parseAsync(prepared);
    return { data };
  }
}

class LoginValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    const raw = await parseBody(c, BodyType.FORM);
    const data = await loginSchema.parseAsync(raw);
    return { data };
  }
}

// --- Routes

class SignupRoute extends XerusRoute {
  method = Method.POST;
  path = "/validation/signup";
  validators = [SignupValidator];

  async handle(c: HTTPContext) {
    const { data } = c.validated(SignupValidator);
    const { username, email, age } = data;

    json(c, {
      status: "success",
      user: { name: username, email, age },
    });
  }
}

class SearchRoute extends XerusRoute {
  method = Method.GET;
  path = "/validation/search";
  validators = [SearchValidator];

  async handle(c: HTTPContext) {
    const { data } = c.validated(SearchValidator);
    json(c, {
      status: "success",
      search: { q: data.q, limit: data.limit },
    });
  }
}

class LoginRoute extends XerusRoute {
  method = Method.POST;
  path = "/validation/login";
  validators = [LoginValidator];

  async handle(c: HTTPContext) {
    const { data } = c.validated(LoginValidator);
    json(c, {
      status: "success",
      msg: `Welcome ${data.username}`,
    });
  }
}

describe("Validation (JSON / QUERY / FORM)", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();
    app.mount(SignupRoute, SearchRoute, LoginRoute);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Validator: JSON - Valid payload should pass", async () => {
    const payload = { username: "xerus_dev", email: "dev@xerus.io", age: 25 };
    const res = await fetch(makeURL(port, "/validation/signup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.user.name).toBe("xerus_dev");
  });

  test("Validator: JSON - Invalid payload should fail", async () => {
    const payload = { username: "no", email: "bad-email", age: 10 };
    const res = await fetch(makeURL(port, "/validation/signup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(400);

    const body = await readMaybeError(res);
    if (typeof body === "string") {
      expect(body).toContain("Validation");
    } else {
      const err = body?.error ?? body;
      expect(err?.code).toBeTruthy();
      expect(String(err?.code)).toContain("VALIDATION");
    }
  });

  test("Validator: QUERY - Valid params should pass", async () => {
    const res = await fetch(makeURL(port, "/validation/search?q=bun&limit=50"));
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.search.q).toBe("bun");
    expect(j.search.limit).toBe(50);
  });

  test("Validator: QUERY - Missing required param should fail", async () => {
    const res = await fetch(makeURL(port, "/validation/search?limit=50"));
    expect(res.status).toBe(400);

    const body = await readMaybeError(res);
    if (typeof body === "string") {
      expect(body).toContain("Search query is required");
    } else {
      const err = body?.error ?? body;
      expect(String(err?.detail ?? err?.message ?? "")).toContain(
        "Search query is required",
      );
    }
  });

  test("Validator: FORM - Valid url-encoded form should pass", async () => {
    const res = await fetch(makeURL(port, "/validation/login"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "username=admin&password=secretpassword",
    });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.msg).toBe("Welcome admin");
  });

  test("Validator: FORM - Invalid content type (sending JSON instead of FORM) should fail", async () => {
    const res = await fetch(makeURL(port, "/validation/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password" }),
    });
    expect(res.status).toBe(400);

    const body = await readMaybeError(res);
    if (typeof body === "string") {
      expect(body).toContain("Unexpected JSON data");
    } else {
      const err = body?.error ?? body;
      expect(String(err?.message ?? err?.detail ?? "")).toContain("Unexpected JSON");
    }
  });
});
