// PATH: /home/jacex/src/xerus/servers/http/8_validation.ts

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

  const signupRoute = new Route("POST", "/validation/signup", async (c, data) => {
    const user = data.get<any>("signup");
    c.json({
      status: "success",
      user: { name: user.username, email: user.email, age: user.age },
    });
  }).validate(Source.JSON, "", "signup", async (_c, raw) => {
    return await signupSchema.parseAsync(raw);
  });

  const searchRoute = new Route("GET", "/validation/search", async (c, data) => {
    const query = data.get<any>("search");
    c.json({
      status: "success",
      search: { q: query.q, limit: query.limit },
    });
  }).validate(Source.QUERY, "", "search", async (_c, raw) => {
    // raw is Record<string,string> of all query params
    const q = String(raw?.q ?? "");
    const limit = Number(raw?.limit ?? 10);
    return await searchSchema.parseAsync({ q, limit });
  });

  const loginRoute = new Route("POST", "/validation/login", async (c, data) => {
    const form = data.get<any>("login");
    c.json({
      status: "success",
      msg: `Welcome ${form.username}`,
    });
  }).validate(Source.FORM, "", "login", async (_c, raw) => {
    // raw is Record<string,string> from urlencoded form
    const username = String(raw?.username ?? "");
    const password = String(raw?.password ?? "");
    return await loginSchema.parseAsync({ username, password });
  });

  app.mount(signupRoute, searchRoute, loginRoute);
}
