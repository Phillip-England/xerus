import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { BodyType } from "../../src/BodyType";
import { HTTPContext } from "../../src/HTTPContext";

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

class SignupRoute extends XerusRoute {
  method = Method.POST;
  path = "/validation/signup";
  
  // Validated Data stored on instance
  username!: string;
  email!: string;
  age!: number;

  async validate(c: HTTPContext) {
    const raw = await c.parseBody(BodyType.JSON);
    const parsed = await signupSchema.parseAsync(raw);
    this.username = parsed.username;
    this.email = parsed.email;
    this.age = parsed.age;
  }

  async handle(c: HTTPContext) {
    c.json({
      status: "success",
      user: { name: this.username, email: this.email, age: this.age },
    });
  }
}

class SearchRoute extends XerusRoute {
  method = Method.GET;
  path = "/validation/search";
  
  q!: string;
  limit!: number;

  async validate(c: HTTPContext) {
    const raw = {
      q: c.query("q"),
      limit: Number(c.query("limit") || 10),
    };
    const parsed = await searchSchema.parseAsync(raw);
    this.q = parsed.q;
    this.limit = parsed.limit;
  }

  async handle(c: HTTPContext) {
    c.json({
      status: "success",
      search: { q: this.q, limit: this.limit },
    });
  }
}

class LoginRoute extends XerusRoute {
  method = Method.POST;
  path = "/validation/login";
  
  username!: string;
  password!: string;

  async validate(c: HTTPContext) {
    const raw = await c.parseBody(BodyType.FORM);
    const parsed = await loginSchema.parseAsync(raw);
    this.username = parsed.username;
    this.password = parsed.password;
  }

  async handle(c: HTTPContext) {
    c.json({
      status: "success",
      msg: `Welcome ${this.username}`,
    });
  }
}

export function validation(app: Xerus) {
  app.mount(SignupRoute, SearchRoute, LoginRoute);
}