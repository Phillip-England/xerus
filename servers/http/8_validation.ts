import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";

// -----------------------------
// Validators (class-based)
// -----------------------------

class SignupBody implements TypeValidator {
  username: string;
  email: string;
  age: number;

  constructor(d: any) {
    this.username = d?.username;
    this.email = d?.email;
    this.age = d?.age;
  }

  async validate() {
    const schema = z.object({
      username: z.string().min(3, "Username must be at least 3 chars"),
      email: z.string().email("Invalid email format"),
      age: z.number().min(18, "Must be 18 or older"),
    });
    await schema.parseAsync(this);
  }
}

class SearchQuery implements TypeValidator {
  q: string;
  limit: number;

  constructor(d: any) {
    this.q = d?.q ?? "";
    this.limit = Number(d?.limit ?? 10);
  }

  async validate() {
    const schema = z.object({
      q: z.string().min(1, "Search query is required"),
      limit: z.number().max(100, "Limit cannot exceed 100"),
    });
    await schema.parseAsync(this);
  }
}

class LoginForm implements TypeValidator {
  username: string;
  password: string;

  constructor(d: any) {
    this.username = d?.username ?? "";
    this.password = d?.password ?? "";
  }

  validate() {
    if (!this.username || !this.password) throw new Error("Missing credentials");
    if (this.password.length < 6) throw new Error("Password too short");
  }
}

// -----------------------------
// Routes
// -----------------------------

export function validation(app: Xerus) {
  const signupRoute = new Route("POST", "/validation/signup", async (_c, data) => {
    const user = data.get(SignupBody);
    _c.json({
      status: "success",
      user: { name: user.username, email: user.email, age: user.age },
    });
  }).validate(SignupBody, Source.JSON);

  const searchRoute = new Route("GET", "/validation/search", async (c, data) => {
    const query = data.get(SearchQuery);
    c.json({
      status: "success",
      search: { q: query.q, limit: query.limit },
    });
  }).validate(SearchQuery, Source.QUERY());

  const loginRoute = new Route("POST", "/validation/login", async (c, data) => {
    const form = data.get(LoginForm);
    c.json({
      status: "success",
      msg: `Welcome ${form.username}`,
    });
  }).validate(LoginForm, Source.FORM);

  app.mount(signupRoute, searchRoute, loginRoute);
}
