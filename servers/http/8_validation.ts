import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { Source } from "../../src/ValidationSource";

export function validation(app: Xerus) {
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

  // -------------------------
  // Signup (JSON body)
  // -------------------------
  const signupRoute = new Route("POST", "/validation/signup", async (c, data) => {
    const user = data.get<any>("json");
    c.json({
      status: "success",
      user: { name: user.username, email: user.email, age: user.age },
    });
  }).validate(Source.JSON(), async (_c, v) => {
    // v.value is the parsed JSON body
    const parsed = await signupSchema.parseAsync(v.value);
    v.set(parsed);
  });

  // -------------------------
  // Search (query params)
  // -------------------------
  const searchRoute = new Route("GET", "/validation/search", async (c, data) => {
    const query = data.get<any>("query");
    c.json({
      status: "success",
      search: { q: query.q, limit: query.limit },
    });
  }).validate(Source.QUERY(), async (_c, v) => {
    const raw = v.value as Record<string, string>;
    const q = String(raw?.q ?? "");
    const limit = Number(raw?.limit ?? 10);
    const parsed = await searchSchema.parseAsync({ q, limit });
    v.set(parsed);
  });

  // -------------------------
  // Login (form body)
  // -------------------------
  const loginRoute = new Route("POST", "/validation/login", async (c, data) => {
    const form = data.get<any>("form");
    c.json({
      status: "success",
      msg: `Welcome ${form.username}`,
    });
  }).validate(Source.FORM(), async (_c, v) => {
    const raw = v.value as any;
    const username = String(raw?.username ?? "");
    const password = String(raw?.password ?? "");
    const parsed = await loginSchema.parseAsync({ username, password });
    v.set(parsed);
  });

  app.mount(signupRoute, searchRoute, loginRoute);
}
