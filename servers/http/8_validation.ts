import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { Source } from "../../src/ValidationSource";

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

class SignupBody {
  username: any;
  email: any;
  age: any;
  constructor(raw: any) {
    this.username = raw?.username;
    this.email = raw?.email;
    this.age = raw?.age;
  }
  async validate() {
    const parsed = await signupSchema.parseAsync({
      username: this.username,
      email: this.email,
      age: this.age,
    });
    this.username = parsed.username;
    this.email = parsed.email;
    this.age = parsed.age;
  }
}

class SearchQuery {
  q: string;
  limit: number;
  constructor(raw: any) {
    const obj = (raw ?? {}) as Record<string, string>;
    this.q = String(obj.q ?? "");
    this.limit = Number(obj.limit ?? 10);
  }
  async validate() {
    const parsed = await searchSchema.parseAsync({ q: this.q, limit: this.limit });
    this.q = parsed.q;
    this.limit = parsed.limit;
  }
}

class LoginForm {
  username: string;
  password: string;
  constructor(raw: any) {
    this.username = String(raw?.username ?? "");
    this.password = String(raw?.password ?? "");
  }
  async validate() {
    const parsed = await loginSchema.parseAsync({
      username: this.username,
      password: this.password,
    });
    this.username = parsed.username;
    this.password = parsed.password;
  }
}

export function validation(app: Xerus) {
  const signupRoute = new Route("POST", "/validation/signup", async (c, data) => {
    const user = data.get(SignupBody);
    c.json({
      status: "success",
      user: { name: user.username, email: user.email, age: user.age },
    });
  }).validate(Source.JSON(), SignupBody);

  const searchRoute = new Route("GET", "/validation/search", async (c, data) => {
    const query = data.get(SearchQuery);
    c.json({
      status: "success",
      search: { q: query.q, limit: query.limit },
    });
  }).validate(Source.QUERY(), SearchQuery);

  const loginRoute = new Route("POST", "/validation/login", async (c, data) => {
    const form = data.get(LoginForm);
    c.json({
      status: "success",
      msg: `Welcome ${form.username}`,
    });
  }).validate(Source.FORM(), LoginForm);

  app.mount(signupRoute, searchRoute, loginRoute);
}
